export const getHexColor = (color: any): string => {
  if (!color) return '#1890ff';

  if (typeof color.toHexString === 'function') {
    return color.toHexString();
  }

  if (typeof color === 'string' && color.startsWith('#')) {
    return color;
  }

  if (color && typeof color === 'object') {
    return color.hex || color.value || '#1890ff';
  }

  return '#1890ff';
};
