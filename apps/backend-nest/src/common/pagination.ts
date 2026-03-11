export interface PaginationParams {
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function parsePagination(
  limitRaw?: string,
  offsetRaw?: string,
  defaultLimit: number = DEFAULT_LIMIT,
  maxLimit: number = MAX_LIMIT,
): PaginationParams {
  let limit = Number(limitRaw);
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  let offset = Number(offsetRaw);
  if (!Number.isFinite(offset) || offset < 0) {
    offset = 0;
  }

  return { limit, offset };
}

