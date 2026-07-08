/**
 * Генерация UUID v4. crypto.randomUUID() доступен только в secure-context
 * (HTTPS/localhost); на стейдже по HTTP его нет - используем fallback на
 * crypto.getRandomValues (доступен и в insecure-context).
 */
export function genId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }
  // Крайний случай - не криптостойко, но достаточно для локального key.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}
