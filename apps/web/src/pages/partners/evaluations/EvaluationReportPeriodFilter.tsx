import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from 'antd';

import type { EvaluationDateBounds } from './partnerEvaluationReportModel';

import styles from './EvaluationReportPeriodFilter.module.scss';

const { RangePicker } = DatePicker;

export type EvaluationReportPeriodFilterValue = {
  dateRange: [Dayjs | null, Dayjs | null] | null;
  excludedRange: [Dayjs | null, Dayjs | null] | null;
};

type Props = {
  value: EvaluationReportPeriodFilterValue;
  onChange: (value: EvaluationReportPeriodFilterValue) => void;
  evaluationDateBounds?: EvaluationDateBounds | null;
};

function resolveSelectableBounds(bounds: EvaluationDateBounds | null | undefined) {
  const today = dayjs().startOf('day');
  const min = bounds ? dayjs(bounds.min).startOf('day') : null;
  const max = bounds ? dayjs(bounds.max).startOf('day') : today;
  const cappedMax = max.isAfter(today, 'day') ? today : max;
  return { min, max: cappedMax };
}

function disabledPeriodDate(
  bounds: EvaluationDateBounds | null | undefined,
): ((current: Dayjs) => boolean) | undefined {
  const { min, max } = resolveSelectableBounds(bounds);
  if (!min) return (current: Dayjs) => current.isAfter(max, 'day');

  return (current: Dayjs) => current.isBefore(min, 'day') || current.isAfter(max, 'day');
}

function disabledExcludeDate(
  bounds: EvaluationDateBounds | null | undefined,
  dateRange: [Dayjs | null, Dayjs | null] | null,
): ((current: Dayjs) => boolean) | undefined {
  const { min, max } = resolveSelectableBounds(bounds);
  const rangeFrom = dateRange?.[0]?.startOf('day') ?? null;
  const rangeTo = dateRange?.[1]?.startOf('day') ?? null;
  const excludeMax =
    rangeTo && rangeTo.isBefore(max, 'day') ? rangeTo : max;

  if (!min) {
    return (current: Dayjs) => {
      if (current.isAfter(excludeMax, 'day')) return true;
      if (rangeFrom && current.isBefore(rangeFrom, 'day')) return true;
      return false;
    };
  }

  return (current: Dayjs) => {
    if (current.isBefore(min, 'day') || current.isAfter(excludeMax, 'day')) return true;
    if (rangeFrom && current.isBefore(rangeFrom, 'day')) return true;
    return false;
  };
}

/** Диапазон отчёта и исключения — оба задаются через RangePicker. */
export function EvaluationReportPeriodFilter({ value, onChange, evaluationDateBounds }: Props) {
  return (
    <div className={styles.root}>
      <RangePicker
        value={value.dateRange}
        onChange={range => onChange({ ...value, dateRange: range })}
        allowEmpty={[true, true]}
        allowClear
        format='DD.MM.YYYY'
        placeholder={['Период с', 'Период по']}
        disabledDate={disabledPeriodDate(evaluationDateBounds)}
      />
      <RangePicker
        value={value.excludedRange}
        onChange={range => onChange({ ...value, excludedRange: range })}
        allowEmpty={[true, true]}
        allowClear
        format='DD.MM.YYYY'
        placeholder={['Исключить с', 'Исключить по']}
        disabledDate={disabledExcludeDate(evaluationDateBounds, value.dateRange)}
      />
    </div>
  );
}
