import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const KONTUR_SCORING_URL = 'https://focus-api.kontur.ru/api3/scoring';

export type ScoringMarkerImpact = 'Reliability' | 'Risk';
export type ScoringMarkerWeight = 'Low' | 'Moderate' | 'Significant' | 'High';
export type ScoringRatingLevel = 'High' | 'Middle' | 'Low';

export interface ScoringMarker {
  markerId: string;
  impact: ScoringMarkerImpact;
  weight: ScoringMarkerWeight;
  name: string;
  description?: string;
}

export interface ScoringModel {
  modelId: string;
  modelName: string;
  modelUpdateDate: string;
  rating: number;
  ratingLevel: ScoringRatingLevel;
  triggeredMarkers: ScoringMarker[];
}

export interface PartnerScoringResult {
  inn: string | null;
  ogrn: string | null;
  focusHref: string | null;
  scoringData: ScoringModel[];
}

@Injectable()
export class PartnerScoringService {
  private readonly logger = new Logger(PartnerScoringService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Запрашивает скоринговую оценку контрагента в Контур.Фокусе.
   * Метод принимает ИНН или ОГРН; предпочитаем ОГРН как более точный идентификатор.
   */
  async getScoring(params: { inn?: string | null; ogrn?: string | null }): Promise<PartnerScoringResult> {
    const ogrn = params.ogrn?.replace(/\D/g, '') || '';
    const inn = params.inn?.replace(/\D/g, '') || '';

    const apiKey = (this.config.get<string>('KONTUR_KEY') ?? process.env.KONTUR_KEY)?.trim();
    if (!apiKey) {
      return { inn: inn || null, ogrn: ogrn || null, focusHref: null, scoringData: [] };
    }
    if (!ogrn && !inn) {
      throw new BadRequestException('У контрагента не указан ИНН или ОГРН для скоринга.');
    }

    const url = new URL(KONTUR_SCORING_URL);
    url.searchParams.set('key', apiKey);
    // ОГРН однозначно идентифицирует организацию; ИНН - запасной вариант.
    if (ogrn) url.searchParams.set('ogrn', ogrn);
    else url.searchParams.set('inn', inn);

    let res: Response;
    try {
      // Таймаут, чтобы зависание Фокуса не держало соединение бесконечно.
      res = await fetch(url.toString(), { method: 'GET', signal: AbortSignal.timeout(8000) });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      this.logger.error(`Kontur scoring fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadGatewayException(
        isTimeout
          ? 'Скоринг Контур.Фокуса не ответил вовремя.'
          : 'Не удалось связаться со скорингом Контур.Фокуса.',
      );
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`Kontur scoring HTTP ${res.status}: ${text.slice(0, 300)}`);
      throw new BadGatewayException('Скоринг Контур.Фокуса вернул ошибку.');
    }

    let payload: unknown;
    try {
      payload = await res.json();
    } catch {
      throw new BadGatewayException('Некорректный ответ скоринга Контур.Фокуса.');
    }

    // Фокус возвращает массив по числу запрошенных организаций; берём первую.
    const entry = Array.isArray(payload) ? payload[0] : payload;
    if (!entry || typeof entry !== 'object') {
      return { inn: inn || null, ogrn: ogrn || null, focusHref: null, scoringData: [] };
    }

    const record = entry as Record<string, unknown>;
    return {
      inn: typeof record.inn === 'string' ? record.inn : inn || null,
      ogrn: typeof record.ogrn === 'string' ? record.ogrn : ogrn || null,
      focusHref: typeof record.focusHref === 'string' ? record.focusHref : null,
      scoringData: Array.isArray(record.scoringData) ? (record.scoringData as ScoringModel[]) : [],
    };
  }
}
