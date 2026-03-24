import dayjs, { type Dayjs } from 'dayjs';

export function formatStageFormDateToIso(value: unknown): string {
  if (value && dayjs.isDayjs(value)) {
    return (value as Dayjs).format('YYYY-MM-DD');
  }
  return '';
}
export function coerceStageFormNumber(value: number | null | undefined): number {
  if (value != null && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}
