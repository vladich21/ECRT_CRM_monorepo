export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const bytesBase = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(bytesBase));
  return `${(bytes / Math.pow(bytesBase, unitIndex)).toFixed(2)} ${sizes[unitIndex]}`;
};

export const formatFileSizeStr = (size: string | null): string => {
  if (!size) return '—';
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
};
