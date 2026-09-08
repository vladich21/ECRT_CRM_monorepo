import { useEffect, useState } from 'react';

/**
 * Системная настройка «меньше движения» (prefers-reduced-motion: reduce).
 *
 * antd считает позицию выпадающих окон по завершении анимации появления.
 * Если длительность анимации обнулена CSS-ом, замер попадает на начальный кадр
 * (окно сжато в точку) — координаты улетают за экран, меню «не открывается».
 *
 * При reduce motion отключаем motion у antd целиком (token.motion = false):
 * позиция считается сразу, без ожидания кадров.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
