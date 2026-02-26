// Функции для форматирования чисел с разделителями разрядов
export const numberFormatter = (value: number | string | undefined) => {
  if (!value) return '';
  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

export const numberParser = (value: string | undefined) => {
  if (!value) return '';
  return value.replace(/\s/g, '');
};
