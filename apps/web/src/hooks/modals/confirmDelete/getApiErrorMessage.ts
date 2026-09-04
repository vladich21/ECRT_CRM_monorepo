function normalizeNestMessage(message: unknown): string | undefined {
  if (typeof message === 'string' && message.trim()) return message.trim();
  if (Array.isArray(message) && message.length > 0) return message.map(String).join(', ');
  if (message && typeof message === 'object' && 'message' in message) {
    const nested = (message as { message?: unknown }).message;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return undefined;
}


export function getApiErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    if (data && typeof data === 'object') {
      const d = data as { message?: unknown; error?: unknown };
      const fromMessage = normalizeNestMessage(d.message);
      if (fromMessage) return fromMessage;
      const fromError = normalizeNestMessage(d.error);
      if (fromError) return fromError;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return undefined;
}
