import type { ReactNode } from 'react';
import { Button, Space, Typography } from 'antd';

import { CriterionScoreGuideContent } from './CriterionScoreGuideAccordion';
import { getCriterionScoreGuide } from './criterionScoreGuides';

import styles from './EvaluationMatrixCriterionRow.module.scss';

const { Text } = Typography;

export type EvaluationMatrixCriterionRowProps = {
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  weightLabel: string;
  score: number;
  weightedDisplay: string;
  scoreSteps: readonly number[];
  onScoreChange: (score: number) => void;
  /** `general` — общая шкала для первичной оценки; иначе код критерия из матрицы Excel. */
  guideCode?: string;
  disabled?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  trailing?: ReactNode;
};

/**
 * Строка матрицы оценки с кнопками баллов и раскрываемой подсказкой по шкале.
 * Переиспользуется в первичной оценке, переоценке и других формах.
 */
export function EvaluationMatrixCriterionRow({
  criterionCode,
  criterionName,
  weightLabel,
  score,
  weightedDisplay,
  scoreSteps,
  onScoreChange,
  guideCode,
  disabled = false,
  expanded = false,
  onToggleExpand,
  trailing,
}: EvaluationMatrixCriterionRowProps) {
  const resolvedGuideCode = guideCode ?? criterionCode;
  const hasGuide = Boolean(getCriterionScoreGuide(resolvedGuideCode));

  const handleRowClick = () => {
    if (!hasGuide || disabled) return;
    onToggleExpand?.();
  };

  return (
    <div className={styles.block}>
      <div
        className={[
          styles.row,
          hasGuide ? styles.rowExpandable : '',
          expanded ? styles.rowOpen : '',
          disabled ? styles.rowDisabled : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleRowClick}
        onKeyDown={(event) => {
          if (!hasGuide || disabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleExpand?.();
          }
        }}
        role={hasGuide ? 'button' : undefined}
        tabIndex={hasGuide && !disabled ? 0 : undefined}
        aria-expanded={hasGuide ? expanded : undefined}
      >
        <div className={styles.colGrow}>
          <div className={styles.criterionTitle}>{criterionName}</div>
          <Text type='secondary' className={styles.criterionMeta}>
            {weightLabel}
          </Text>
          {hasGuide ? (
            <span className={styles.expandHint}>{expanded ? 'Свернуть шкалу' : 'Показать шкалу'}</span>
          ) : null}
        </div>
        <Space size={4} wrap onClick={(event) => event.stopPropagation()}>
          {scoreSteps.map((step) => (
            <Button
              key={step}
              size='small'
              type={score === step ? 'primary' : 'default'}
              disabled={disabled}
              onClick={() => onScoreChange(step)}
            >
              {step}
            </Button>
          ))}
        </Space>
        <Text strong className={styles.scoreAccent}>
          {disabled ? '-' : score}
        </Text>
        <Text strong className={styles.weightedAccent}>
          {disabled ? '-' : weightedDisplay}
        </Text>
        {trailing ? (
          <div className={styles.trailing} onClick={(event) => event.stopPropagation()}>
            {trailing}
          </div>
        ) : null}
      </div>
      {expanded && hasGuide ? (
        <div className={styles.guidePanel}>
          <CriterionScoreGuideContent criterionCode={resolvedGuideCode} currentScore={disabled ? null : score} />
        </div>
      ) : null}
    </div>
  );
}
