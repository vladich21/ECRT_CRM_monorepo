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

function disabledOutsideEvaluationBounds(
  bounds: EvaluationDateBounds | null | undefined,
): ((current: Dayjs) => boolean) | undefined {
  if (!bounds) return undefined;

  const min = dayjs(bounds.min).startOf('day');
  const max = dayjs(bounds.max).startOf('day');

  return (current: Dayjs) => current.isBefore(min, 'day') || current.isAfter(max, 'day');
}

function disabledOutsideExcludeWindow(
  bounds: EvaluationDateBounds | null | undefined,
  dateRange: [Dayjs | null, Dayjs | null] | null,
): ((current: Dayjs) => boolean) | undefined {
  const outsideBounds = disabledOutsideEvaluationBounds(bounds);
  const rangeFrom = dateRange?.[0]?.startOf('day') ?? null;
  const rangeTo = dateRange?.[1]?.startOf('day') ?? null;

  return (current: Dayjs) => {
    if (outsideBounds?.(current)) return true;
    if (rangeFrom && current.isBefore(rangeFrom, 'day')) return true;
    if (rangeTo && current.isAfter(rangeTo, 'day')) return true;
    return false;
  };
}

/** Диапазон отчёта и исключения — оба задаются через RangePicker. */
export function EvaluationReportPeriodFilter({ value, onChange, evaluationDateBounds }: Props) {
  const disablePeriodDate = disabledOutsideEvaluationBounds(evaluationDateBounds);
  const disableExcludeDate = disabledOutsideExcludeWindow(evaluationDateBounds, value.dateRange);

  return (
    <div className={styles.root}>
      <RangePicker
        value={value.dateRange}
        onChange={range => onChange({ ...value, dateRange: range })}
        allowEmpty={[true, true]}
        allowClear
        format='DD.MM.YYYY'
        placeholder={['Период с', 'Период по']}
        disabledDate={disablePeriodDate}
      />
      <RangePicker
        value={value.excludedRange}
        onChange={range => onChange({ ...value, excludedRange: range })}
        allowEmpty={[true, true]}
        allowClear
        format='DD.MM.YYYY'
        placeholder={['Исключить с', 'Исключить по']}
        disabledDate={disableExcludeDate}
      />
    </div>
  );
}
