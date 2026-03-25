import type { ReactNode } from 'react';
import { Tag, Typography } from 'antd';
import dayjs from 'dayjs';

import {
  calendarDaysUntil,
  isNextReevaluationInSoonWindow,
  scoreColor,
} from './supplierEvaluationUi';

/** Тег среднего балла или «Не оценён» для шапки детальной страницы. */
export function PartnerHeaderAvgScoreTag({
  avgScore,
  loading,
}: {
  avgScore: number | null | undefined;
  loading: boolean;
}): ReactNode {
  if (loading) return '…';
  if (avgScore == null) {
    return (
      <Tag color='default' style={{ margin: 0, verticalAlign: 'middle' }}>
        Не оценён
      </Tag>
    );
  }
  const c = scoreColor(avgScore);
  return (
    <Tag
      style={{
        margin: 0,
        verticalAlign: 'middle',
        color: c,
        borderColor: `${c}80`,
        background: `${c}18`,
      }}
    >
      {avgScore.toFixed(2)}
    </Tag>
  );
}

/**
 * Дата следующей оценки в `Tag` + пояснение в скобках (просрочка / «осталось N дн.»).
 * `forDarkHeader` — цвета текста для тёмного градиента шапки контрагента.
 */
export function PartnerNextEvalDateTags({
  nextIso,
  forDarkHeader,
}: {
  nextIso: string;
  forDarkHeader?: boolean;
}): ReactNode {
  const days = calendarDaysUntil(nextIso);
  const soon = isNextReevaluationInSoonWindow(nextIso);

  let suffix: ReactNode = null;
  if (days < 0) {
    suffix = forDarkHeader ? (
      <span style={{ color: '#ffccc7', fontSize: 13, marginLeft: 6 }}>({Math.abs(days)} дн. проср.)</span>
    ) : (
      <Typography.Text type='danger' style={{ fontSize: 13, marginLeft: 6 }}>
        ({Math.abs(days)} дн. проср.)
      </Typography.Text>
    );
  } else if (soon && days >= 0) {
    const text = days === 0 ? 'сегодня' : `осталось ${days} дн.`;
    suffix = forDarkHeader ? (
      <span style={{ color: '#ffe58f', fontSize: 13, marginLeft: 6 }}>({text})</span>
    ) : (
      <Typography.Text type='warning' style={{ fontSize: 13, marginLeft: 6 }}>
        ({text})
      </Typography.Text>
    );
  }

  return (
    <>
      <Tag color={soon ? 'warning' : 'blue'} style={{ margin: 0, verticalAlign: 'middle' }}>
        {dayjs(nextIso).format('DD.MM.YYYY')}
      </Tag>
      {suffix}
    </>
  );
}
