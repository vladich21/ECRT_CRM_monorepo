import { MARKET_MIN_QUOTES, MARKET_OUTLIER_PERCENT } from './purchase-quote.enums';

export function priceToKopecks(amount: number): number {
  return Math.round(amount * 100);
}

export function kopecksToAmount(kopecks: number): string {
  return (kopecks / 100).toFixed(2);
}

/**
 * КП вводится с НДС. Рынок (БП-34) считает среднее без НДС.
 * vatPercent 22 → делим на 1.22; 0 или пусто — нетто = гросс.
 */
export function netFromGrossKopecks(grossKopecks: number, vatPercent: number | null): number {
  if (vatPercent == null || vatPercent <= 0) return grossKopecks;
  const vatBps = Math.round(vatPercent * 100);
  return Math.round((grossKopecks * 10_000) / (10_000 + vatBps));
}

export function grossFromNetKopecks(netKopecks: number, vatPercent: number | null): number {
  if (vatPercent == null || vatPercent <= 0) return netKopecks;
  const vatBps = Math.round(vatPercent * 100);
  return Math.round((netKopecks * (10_000 + vatBps)) / 10_000);
}

export function meanKopecks(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** |value − avg| / avg > 33%. avg = 0 — выбросов нет. */
export function isMarketOutlier(netKopecks: number, averageKopecks: number): boolean {
  if (averageKopecks <= 0) return false;
  return Math.abs(netKopecks - averageKopecks) * 100 > MARKET_OUTLIER_PERCENT * averageKopecks;
}

export type MarketQuoteInput = {
  quote_id: string;
  net_kopecks: number;
};

export type MarketExcludedQuote = {
  quote_id: string;
  net_kopecks: number;
  deviation_percent: string;
};

export type MarketNmcdOk = {
  ok: true;
  average_before: number;
  average_after: number;
  included: MarketQuoteInput[];
  excluded: MarketExcludedQuote[];
};

export type MarketNmcdFail = {
  ok: false;
  code: 'too_few_quotes' | 'too_few_after_filter';
  average_before: number | null;
  included: MarketQuoteInput[];
  excluded: MarketExcludedQuote[];
};

export type MarketNmcdResult = MarketNmcdOk | MarketNmcdFail;

function deviationPercent(netKopecks: number, averageKopecks: number): string {
  if (averageKopecks <= 0) return '0.00';
  return ((netKopecks - averageKopecks) / averageKopecks * 100).toFixed(2);
}

export function calculateMarketNmcd(quotes: MarketQuoteInput[]): MarketNmcdResult {
  if (quotes.length < MARKET_MIN_QUOTES) {
    return {
      ok: false,
      code: 'too_few_quotes',
      average_before: quotes.length === 0 ? null : meanKopecks(quotes.map(q => q.net_kopecks)),
      included: quotes,
      excluded: [],
    };
  }

  const averageBefore = meanKopecks(quotes.map(q => q.net_kopecks));
  const included: MarketQuoteInput[] = [];
  const excluded: MarketExcludedQuote[] = [];

  for (const quote of quotes) {
    if (isMarketOutlier(quote.net_kopecks, averageBefore)) {
      excluded.push({
        quote_id: quote.quote_id,
        net_kopecks: quote.net_kopecks,
        deviation_percent: deviationPercent(quote.net_kopecks, averageBefore),
      });
    } else {
      included.push(quote);
    }
  }

  if (included.length < MARKET_MIN_QUOTES) {
    return {
      ok: false,
      code: 'too_few_after_filter',
      average_before: averageBefore,
      included,
      excluded,
    };
  }

  return {
    ok: true,
    average_before: averageBefore,
    average_after: meanKopecks(included.map(q => q.net_kopecks)),
    included,
    excluded,
  };
}

export type ComparisonBestIds = {
  price: string | null;
  delivery: string | null;
  warranty: string | null;
};

export type ComparisonBestInput = {
  quote_id: string;
  net_kopecks: number;
  delivery_days: number | null;
  warranty_months: number | null;
};

/** Лучшие: мин. нетто, мин. срок, макс. гарантия. Ничья — первое КП. */
export function pickBestQuoteIds(quotes: ComparisonBestInput[]): ComparisonBestIds {
  let price: string | null = null;
  let priceK = Number.POSITIVE_INFINITY;
  let delivery: string | null = null;
  let deliveryDays = Number.POSITIVE_INFINITY;
  let warranty: string | null = null;
  let warrantyMonths = Number.NEGATIVE_INFINITY;

  for (const quote of quotes) {
    if (quote.net_kopecks < priceK) {
      priceK = quote.net_kopecks;
      price = quote.quote_id;
    }
    if (quote.delivery_days != null && quote.delivery_days < deliveryDays) {
      deliveryDays = quote.delivery_days;
      delivery = quote.quote_id;
    }
    if (quote.warranty_months != null && quote.warranty_months > warrantyMonths) {
      warrantyMonths = quote.warranty_months;
      warranty = quote.quote_id;
    }
  }

  return { price, delivery, warranty };
}

/** Отклонение цены КП от экспертной: (value − expert) / expert, в процентах. */
export function deviationFromExpertPercent(valueKopecks: number, expertKopecks: number): string | null {
  if (expertKopecks <= 0) return null;
  return ((valueKopecks - expertKopecks) / expertKopecks * 100).toFixed(1);
}
