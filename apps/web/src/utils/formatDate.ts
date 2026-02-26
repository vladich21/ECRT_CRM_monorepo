export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (dateStart.getTime() === startOfToday.getTime()) {
    return `сегодня в ${timeStr}`;
  }

  if (dateStart.getTime() === startOfYesterday.getTime()) {
    return `вчера в ${timeStr}`;
  }

  const monthNames = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];

  return `${day} ${month} в ${timeStr}`;
};
