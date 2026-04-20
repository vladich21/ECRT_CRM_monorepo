export function readAxiosLikeError(error: unknown): { httpStatus?: number; message?: string } {
  if (!error || typeof error !== 'object') return {};
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } }).response;
  if (!response) return {};
  const raw = response.data?.message;
  const message = raw == null ? undefined : typeof raw === 'string' ? raw : JSON.stringify(raw);
  return { httpStatus: response.status, message };
}
