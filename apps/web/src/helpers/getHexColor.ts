export const getHexColor = (color: any): string => {
  if (!color) return '#1890ff';

  // Если color - это объект с методом toHexString
  if (typeof color.toHexString === 'function') {
    return color.toHexString();
  }

  // Если color - это уже hex строка
  if (typeof color === 'string' && color.startsWith('#')) {
    return color;
  }

  // Если color - это объект с цветом в другом формате
  if (color && typeof color === 'object') {
    return color.hex || color.value || '#1890ff';
  }

  return '#1890ff'; // fallback
};
