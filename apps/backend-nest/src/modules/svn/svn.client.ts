import { execFile } from 'child_process';
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
const CAT_TIMEOUT_MS = 180_000;
/** Больше 100 МБ в реестр не принимаем: это документация, а не дистрибутивы. */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

@Injectable()
export class SvnClient {
  private readonly logger = new Logger(SvnClient.name);
  private materializedKeyPath: string | null = null;

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
   * Переменные окружения для svn: туннель к серверу конструкторов идёт по SSH,
   * поэтому ключ и пользователя передаём через SVN_SSH. IdentitiesOnly обязателен —
   * без него ssh перебирает все ключи агента и сервер рвёт связь на «too many
   * authentication failures».
   */
  private processEnv(): NodeJS.ProcessEnv {
    const { keyPath, user } = this.env();
    if (!keyPath) return process.env;
    const parts = ['ssh', '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes', '-i', keyPath];
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

  /** Содержимое файла указанной ревизии (по умолчанию — текущей). */
  async cat(path: string, revision?: number): Promise<Buffer> {
    const target = revision ? `${this.fullUrl(path)}@${revision}` : this.fullUrl(path);
    const args = revision ? ['cat', '-r', String(revision), target] : ['cat', target];
    return this.run(args, CAT_TIMEOUT_MS, MAX_FILE_BYTES);
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
