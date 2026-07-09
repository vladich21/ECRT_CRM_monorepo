import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from 'antd';

import type { EvaluationDateBounds } from './partnerEvaluationReportModel';
import {
  dayjsToQuarterEnd,
  dayjsToQuarterStart,
  formatQuarterPickerValue,
  isQuarterAfterBounds,
  isQuarterBeforeBounds,
} from './evaluationReportQuarterUtils';

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

function disabledPeriodQuarter(
  bounds: EvaluationDateBounds | null | undefined,
): ((current: Dayjs) => boolean) | undefined {
  const selectable = resolveSelectableBounds(bounds);
  return (current: Dayjs) =>
    isQuarterBeforeBounds(current, selectable) || isQuarterAfterBounds(current, selectable);
}

function disabledExcludeQuarter(
  bounds: EvaluationDateBounds | null | undefined,
  dateRange: [Dayjs | null, Dayjs | null] | null,
): ((current: Dayjs) => boolean) | undefined {
  const selectable = resolveSelectableBounds(bounds);
  const periodStart = dateRange?.[0] ? dayjs(dayjsToQuarterStart(dateRange[0])) : null;
  const periodEnd = dateRange?.[1] ? dayjs(dayjsToQuarterEnd(dateRange[1])) : null;

  return (current: Dayjs) => {
    if (isQuarterBeforeBounds(current, selectable) || isQuarterAfterBounds(current, selectable)) {
      return true;
    }
    const currentStart = dayjs(dayjsToQuarterStart(current));
    const currentEnd = dayjs(dayjsToQuarterEnd(current));
    if (periodStart && currentEnd.isBefore(periodStart, 'day')) return true;
    if (periodEnd && currentStart.isAfter(periodEnd, 'day')) return true;
    return false;
  };
}

const quarterPickerProps = {
  picker: 'quarter' as const,
  allowEmpty: [true, true] as [boolean, boolean],
  allowClear: true,
  format: (value: Dayjs) => formatQuarterPickerValue(value),
};

/** Диапазон отчёта и исключения — выбор по кварталам. */
export function EvaluationReportPeriodFilter({
  value,
  onChange,
  evaluationDateBounds,
}: Props) {
  return (
    <div className={styles.root}>
      <RangePicker
        {...quarterPickerProps}
        value={value.dateRange}
        onChange={range => onChange({ ...value, dateRange: range })}
        placeholder={['Период с', 'Период по']}
        disabledDate={disabledPeriodQuarter(evaluationDateBounds)}
        className={styles.quarterPicker}
      />
      <RangePicker
        {...quarterPickerProps}
        value={value.excludedRange}
        onChange={range => onChange({ ...value, excludedRange: range })}
        placeholder={['Исключить с', 'Исключить по']}
        disabledDate={disabledExcludeQuarter(evaluationDateBounds, value.dateRange)}
        className={styles.quarterPicker}
      />
    </div>
  );
}
