import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DATANEWTON_URL = 'https://api.datanewton.ru/v1/counterparty';
const DEFAULT_FILTERS = 'OKVED_BLOCK,NEGATIVE_LISTS_BLOCK,ADDRESS_BLOCK';

@Injectable()
export class PartnerInnLookupService {
  private readonly logger = new Logger(PartnerInnLookupService.name);

  constructor(private readonly config: ConfigService) {}

  async lookupByInn(innRaw: string): Promise<unknown> {
    // В Docker ключ приходит из process.env; ConfigService обычно тоже видит, но оставляем fallback
    const apiKey = (
      this.config.get<string>('DATANEWTON_API_KEY') ?? process.env.DATANEWTON_API_KEY
    )?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Поиск контрагента по ИНН не настроен (DATANEWTON_API_KEY на сервере).',
      );
    }

    const digits = innRaw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 12) {
      throw new BadRequestException('Укажите корректный ИНН (10 или 12 цифр).');
    }

    const url = new URL(DATANEWTON_URL);
    url.searchParams.set('inn', digits);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('filters', DEFAULT_FILTERS);

    let res: Response;
    try {
      res = await fetch(url.toString(), { method: 'GET' });
    } catch (err) {
      this.logger.error(`DataNewton fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadGatewayException('Не удалось связаться с сервисом данных по ИНН.');
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`DataNewton HTTP ${res.status}: ${text.slice(0, 300)}`);
      throw new BadGatewayException('Сервис данных по ИНН вернул ошибку.');
    }

    try {
      return await res.json();
    } catch {
      throw new BadGatewayException('Некорректный ответ сервиса данных по ИНН.');
    }
  }
}
