/**
 * Достаёт человекочитаемое сообщение из ответа API (axios) или из Error.
 */
export function getApiErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (msg != null && msg !== '') return String(msg);
  }
  if (error instanceof Error && error.message) return error.message;
  return undefined;
}
