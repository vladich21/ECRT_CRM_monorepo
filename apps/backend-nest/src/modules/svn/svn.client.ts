import { execFile, spawn } from 'child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Запись каталога SVN: файл или папка. */
export type SvnEntry = {
  name: string;
  kind: 'file' | 'dir';
  path: string;
  size: number | null;
  revision: number | null;
  author: string | null;
  date: string | null;
};

export type SvnFileInfo = {
  path: string;
  revision: number;
  repoUuid: string;
  size: number | null;
};

const LIST_TIMEOUT_MS = 60_000;

@Injectable()
export class SvnClient {
  private readonly logger = new Logger(SvnClient.name);
  private materializedKeyPath: string | null = null;
  private knownHostsPath: { path: string; pinned: boolean } | null = null;

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>('SVN_URL'));
  }

  private env() {
    const url = (this.config.get<string>('SVN_URL') ?? '').trim().replace(/\/$/, '');
    if (!url) {
      throw new ServiceUnavailableException('SVN не настроен (SVN_URL)');
    }
    const user = (this.config.get<string>('SVN_USER') ?? '').trim();
    return { url, keyPath: this.resolveKeyPath(), user };
  }

  /**
   * Ключ к SVN приходит либо файлом (SVN_SSH_KEY), либо содержимым в base64
   * (SVN_SSH_KEY_BASE64) — второе удобнее в CI: секрет живёт в переменных
   * проекта, а не на диске сервера. Содержимое разворачивается во временный
   * файл с правами 600, ssh другого не принимает.
   */
  private resolveKeyPath(): string {
    const filePath = (this.config.get<string>('SVN_SSH_KEY') ?? '').trim();
    if (filePath && existsSync(filePath)) return filePath;

    const encoded = (this.config.get<string>('SVN_SSH_KEY_BASE64') ?? '').trim();
    if (!encoded) return filePath;

    if (this.materializedKeyPath && existsSync(this.materializedKeyPath)) {
      return this.materializedKeyPath;
    }
    try {
      const dir = join(tmpdir(), 'svn-key');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const target = join(dir, 'id_svn');
      const body = Buffer.from(encoded, 'base64').toString('utf8');
      writeFileSync(target, body.endsWith('\n') ? body : `${body}\n`, { mode: 0o600 });
      chmodSync(target, 0o600);
      this.materializedKeyPath = target;
      return target;
    } catch (err) {
      this.logger.error('не удалось подготовить ключ SVN', err as Error);
      return filePath;
    }
  }

  /**
   * Доверие к ключу хоста SVN. В контейнере известных хостов нет, и ssh отвечает
   * «Host key verification failed» — svn при этом сообщает лишь о недоступности сервера.
   * Если ключ хоста задан (SVN_SSH_KNOWN_HOSTS_BASE64) — сверяем строго по нему,
   * иначе принимаем ключ при первом обращении и запоминаем его на время жизни контейнера.
   */
  private resolveKnownHosts(): { path: string; pinned: boolean } | null {
    if (this.knownHostsPath && existsSync(this.knownHostsPath.path)) return this.knownHostsPath;
    const encoded = (this.config.get<string>('SVN_SSH_KNOWN_HOSTS_BASE64') ?? '').trim();
    try {
      const dir = join(tmpdir(), 'svn-key');
      mkdirSync(dir, { recursive: true, mode: 0o700 });
      const target = join(dir, 'known_hosts');
      if (encoded) {
        const body = Buffer.from(encoded, 'base64').toString('utf8');
        writeFileSync(target, body.endsWith('\n') ? body : `${body}\n`, { mode: 0o600 });
      } else if (!existsSync(target)) {
        writeFileSync(target, '', { mode: 0o600 });
      }
      this.knownHostsPath = { path: target, pinned: Boolean(encoded) };
      return this.knownHostsPath;
    } catch (err) {
      this.logger.error('не удалось подготовить known_hosts для SVN', err as Error);
      return null;
    }
  }

  /**
   * Переменные окружения для svn: туннель к серверу конструкторов идёт по SSH,
   * поэтому ключ и пользователя передаём через SVN_SSH. IdentitiesOnly обязателен —
   * без него ssh перебирает все ключи агента и сервер рвёт связь на «too many
   * authentication failures».
   */
  private processEnv(): NodeJS.ProcessEnv {
    const { keyPath, user } = this.env();
    if (!keyPath) return process.env;
    const parts = ['ssh', '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-i', keyPath];
    const knownHosts = this.resolveKnownHosts();
    if (knownHosts) {
      parts.push(
        '-o',
        `StrictHostKeyChecking=${knownHosts.pinned ? 'yes' : 'accept-new'}`,
        '-o',
        `UserKnownHostsFile=${knownHosts.path}`,
      );
    }
    if (user) parts.push('-l', user);
    return { ...process.env, SVN_SSH: parts.join(' ') };
  }

  private run(args: string[], timeoutMs: number, maxBuffer: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      execFile(
        'svn',
        ['--non-interactive', ...args],
        { timeout: timeoutMs, maxBuffer, env: this.processEnv(), encoding: 'buffer' },
        (err, stdout, stderr) => {
          if (err) {
            const message = Buffer.isBuffer(stderr) ? stderr.toString('utf8') : String(stderr);
            this.logger.warn(`svn ${args[0]} → ${message.slice(0, 300)}`);
            reject(new ServiceUnavailableException(this.humanError(message)));
            return;
          }
          resolve(stdout as Buffer);
        },
      );
    });
  }

  /** Сообщения svn техничны: переводим в то, что понятно пользователю реестра. */
  private humanError(raw: string): string {
    if (/E170013|E730054|Unable to connect/i.test(raw)) return 'Сервер SVN недоступен';
    if (/E170001|Authorization failed/i.test(raw)) return 'Нет доступа к этому каталогу SVN';
    if (/E200009|E160013|non-existent|not found/i.test(raw)) return 'Путь в SVN не найден';
    return 'Не удалось обратиться к SVN';
  }

  private fullUrl(path: string): string {
    const clean = (path ?? '').replace(/^\/+/, '');
    const { url } = this.env();
    return clean ? `${url}/${clean.split('/').map(encodeURIComponent).join('/')}` : url;
  }

  /** Содержимое каталога. Дерево грузим по одному уровню: репозиторий большой. */
  async list(path: string): Promise<SvnEntry[]> {
    const xml = (await this.run(['ls', '--xml', this.fullUrl(path)], LIST_TIMEOUT_MS, 16 * 1024 * 1024)).toString('utf8');
    const entries: SvnEntry[] = [];
    const base = (path ?? '').replace(/^\/+|\/+$/g, '');

    for (const chunk of xml.split('<entry').slice(1)) {
      const kind = /kind="(file|dir)"/.exec(chunk)?.[1] as 'file' | 'dir' | undefined;
      const name = /<name>([\s\S]*?)<\/name>/.exec(chunk)?.[1];
      if (!kind || !name) continue;
      const size = /<size>(\d+)<\/size>/.exec(chunk)?.[1];
      const revision = /<commit\s+revision="(\d+)"/.exec(chunk)?.[1];
      entries.push({
        name: this.unescape(name),
        kind,
        path: base ? `${base}/${this.unescape(name)}` : this.unescape(name),
        size: size ? Number(size) : null,
        revision: revision ? Number(revision) : null,
        author: this.unescape(/<author>([\s\S]*?)<\/author>/.exec(chunk)?.[1] ?? '') || null,
        date: /<date>([\s\S]*?)<\/date>/.exec(chunk)?.[1] ?? null,
      });
    }

    // Каталоги вперёд, дальше по алфавиту: так дерево читается как в проводнике.
    return entries.sort((a, b) =>
      a.kind === b.kind ? a.name.localeCompare(b.name, 'ru') : a.kind === 'dir' ? -1 : 1,
    );
  }

  /** Сведения о файле: ревизия на текущий момент и UUID репозитория. */
  async info(path: string): Promise<SvnFileInfo> {
    const xml = (await this.run(['info', '--xml', this.fullUrl(path)], LIST_TIMEOUT_MS, 4 * 1024 * 1024)).toString('utf8');
    const revision = /<commit\s+revision="(\d+)"/.exec(xml)?.[1] ?? /revision="(\d+)"/.exec(xml)?.[1];
    const repoUuid = /<uuid>([\s\S]*?)<\/uuid>/.exec(xml)?.[1] ?? '';
    const size = /<size>(\d+)<\/size>/.exec(xml)?.[1];
    return {
      path,
      revision: revision ? Number(revision) : 0,
      repoUuid,
      size: size ? Number(size) : null,
    };
  }

  /**
   * Текущие ревизии сразу нескольких файлов. svn info принимает список целей,
   * поэтому обходимся одним ssh-подключением вместо запроса на каждый файл.
   */
  async currentRevisions(paths: string[]): Promise<Record<string, number>> {
    const unique = [...new Set(paths.filter(Boolean))].slice(0, 200);
    if (unique.length === 0) return {};

    const xml = (
      await this.run(['info', '--xml', ...unique.map(p => this.fullUrl(p))], LIST_TIMEOUT_MS, 16 * 1024 * 1024)
    ).toString('utf8');

    const result: Record<string, number> = {};
    for (const chunk of xml.split('<entry').slice(1)) {
      const rawUrl = /<url>([\s\S]*?)<\/url>/.exec(chunk)?.[1];
      const revision = /<commit\s+revision="(\d+)"/.exec(chunk)?.[1];
      if (!rawUrl || !revision) continue;
      const decoded = decodeURIComponent(this.unescape(rawUrl));
      const match = unique.find(p => decoded.endsWith(p));
      if (match) result[match] = Number(revision);
    }
    return result;
  }

  /** Размер файла в байтах на ревизии — tus требует его до начала потоковой передачи. */
  async fileSize(path: string, revision: number): Promise<number> {
    const target = `${this.fullUrl(path)}@${revision}`;
    const xml = (await this.run(['ls', '--xml', target], LIST_TIMEOUT_MS, 1024 * 1024)).toString('utf8');
    const size = /<size>(\d+)<\/size>/.exec(xml)?.[1];
    if (size == null) {
      throw new ServiceUnavailableException('Не удалось узнать размер файла в SVN');
    }
    return Number(size);
  }

  /**
   * Содержимое файла потоком: гигабайтные файлы не копятся в памяти и не упираются в лимит буфера.
   * `completion` завершается, когда svn отработал (при сбое — понятной ошибкой); `abort` останавливает
   * процесс, если получатель сорвался и вывод больше никто не читает.
   */
  catStream(
    path: string,
    revision: number,
  ): { stream: NodeJS.ReadableStream; completion: Promise<void>; abort: () => void } {
    const target = `${this.fullUrl(path)}@${revision}`;
    const child = spawn('svn', ['--non-interactive', 'cat', '-r', String(revision), target], {
      env: this.processEnv(),
    });

    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      if (stderr.length < 4000) stderr += chunk;
    });

    const completion = new Promise<void>((resolve, reject) => {
      child.on('error', (err) => {
        this.logger.warn(`svn cat → ${err.message}`);
        reject(new ServiceUnavailableException(this.humanError(err.message)));
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        this.logger.warn(`svn cat → ${stderr.slice(0, 300)}`);
        reject(new ServiceUnavailableException(this.humanError(stderr)));
      });
    });
    // Отказ svn может прийти раньше, чем получатель начнёт ждать completion: без обработчика это
    // необработанное отклонение, которое роняет процесс. Ожидающий всё равно получит ошибку.
    completion.catch(() => undefined);

    return { stream: child.stdout, completion, abort: () => child.kill() };
  }

  private unescape(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
}
