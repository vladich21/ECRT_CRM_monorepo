import type { ReactNode } from 'react';
import { Tag, Typography } from 'antd';
import dayjs from 'dayjs';

import {
  calendarDaysUntil,
  daysRemainingSuffix,
  formatEvaluationScoreDisplay,
  isNextReevaluationInSoonWindow,
  scoreColor,
} from './supplierEvaluationUi';
import styles from './partnerEvalKpiDisplay.module.scss';

/** Тег среднего балла или «Не оценен» для шапки детальной страницы. */
export function PartnerHeaderAvgScoreTag({
  avgScore,
  loading,
  forDarkHeader,
}: {
  avgScore: number | null | undefined;
  loading: boolean;
  forDarkHeader?: boolean;
}): ReactNode {
  if (loading) {
    return '…';
  }

  if (avgScore == null) {
    if (forDarkHeader) {
      return (
        <Tag bordered className={`${styles.avgTag} ${styles.avgTagHeaderGhost}`}>
          Не оценен
        </Tag>
      );
    }
    return (
      <Tag color='default' className={styles.avgTag}>
        Не оценен
      </Tag>
    );
  }

  const color = scoreColor(avgScore);
  const borderColor = `${color}80`;
  const background = forDarkHeader ? 'transparent' : `${color}18`;

  return (
    <Tag bordered={Boolean(forDarkHeader)} className={styles.avgTag} style={{ color, borderColor, background }}>
      {formatEvaluationScoreDisplay(avgScore)}
    </Tag>
  );
}

/**
 * Дата следующей оценки: `Tag` + скобки (шапка / по умолчанию).
 * `layout="registry"` — карточка в реестре: одна строка, без рамки у даты.
 */
export function PartnerNextEvalDateTags({
  nextIso,
  forDarkHeader,
  layout,
}: {
  nextIso: string;
  forDarkHeader?: boolean;
  layout?: 'registry';
}): ReactNode {
  const days = calendarDaysUntil(nextIso);
  const soon = isNextReevaluationInSoonWindow(nextIso);
  const dateStr = dayjs(nextIso).format('DD.MM.YYYY');
  const isRegistryCard = layout === 'registry' && !forDarkHeader;

  // ─── Карточка в реестре (светлый фон) ───
  if (isRegistryCard) {
    let line2: ReactNode = null;

    if (days < 0) {
      const text = `${Math.abs(days)} дн. проср.`;
      line2 = (
        <Typography.Text type='danger' className={styles.registrySuffix}>
          ({text})
        </Typography.Text>
      );
    } else if (soon && days >= 0) {
      const text = daysRemainingSuffix(days);
      line2 = (
        <Typography.Text type='warning' className={styles.registrySuffix}>
          ({text})
        </Typography.Text>
      );
    }

    if (!line2) {
      return <span className={styles.registryDate}>{dateStr}</span>;
    }

    return (
      <span className={styles.registryWrap}>
        <span className={styles.registryDateStrong}>{dateStr}</span> {line2}
      </span>
    );
  }

  // ─── Шапка контрагента (темный фон) ───
  if (forDarkHeader) {
    let line2: ReactNode = null;

    if (days < 0) {
      const text = `${Math.abs(days)} дн. проср.`;
      line2 = <span className={styles.suffixDarkOverdue}>({text})</span>;
    } else if (soon && days >= 0) {
      const text = daysRemainingSuffix(days);
      line2 = <span className={styles.suffixDarkSoon}>({text})</span>;
    }

    const dateClass = soon ? styles.nextDateDarkSoon : styles.nextDateDarkNormal;

    return (
      <>
        <span className={dateClass}>{dateStr}</span>
        {line2}
      </>
    );
  }

  // ─── Обычная светлая строка ───
  let line2: ReactNode = null;

  if (days < 0) {
    const text = `${Math.abs(days)} дн. проср.`;
    line2 = (
      <Typography.Text type='danger' className={`${styles.registrySuffix} ${styles.registrySuffixSpacing}`}>
        ({text})
      </Typography.Text>
    );
  } else if (soon && days >= 0) {
    const text = daysRemainingSuffix(days);
    line2 = (
      <Typography.Text type='warning' className={`${styles.registrySuffix} ${styles.registrySuffixSpacing}`}>
        ({text})
      </Typography.Text>
    );
  }

  return (
    <>
      <Tag color={soon ? 'warning' : 'blue'} className={styles.avgTag}>
        {dateStr}
      </Tag>
      {line2}
    </>
  );
}
