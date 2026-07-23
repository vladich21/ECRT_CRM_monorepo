import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { DownOutlined } from '@ant-design/icons';

import {
  adjacentScoreLevels,
  getCriterionScoreGuide,
  orderedGuideLevels,
  type CriterionScoreGuide,
  type CriterionScoreLevelGuide,
  type CriterionScoreLevelValue,
} from './criterionScoreGuides';

import styles from './CriterionScoreGuideAccordion.module.scss';

const LEVEL_COLORS = ['#8b0000', '#cc5500', '#ffbf00', '#88cc00', '#008000'] as const;

function levelColor(score: number): string {
  return LEVEL_COLORS[Math.min(4, Math.max(0, Math.round(score) - 1))];
}

export type CriterionScoreGuideAccordionProps = {
  criterionCode: string;
  title?: string;
  currentScore?: number | null;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentOnly?: boolean;
  className?: string;
};

function LevelCard({
  level,
  tone,
}: {
  level: CriterionScoreLevelGuide;
  tone: 'exact' | 'adjacent' | 'muted';
}) {
  const color = levelColor(level.score);
  return (
    <div
      className={[
        styles.level,
        tone === 'exact' ? styles.levelExact : '',
        tone === 'adjacent' ? styles.levelAdjacent : '',
        tone === 'muted' ? styles.levelMuted : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ borderLeftColor: color }}
    >
      <div className={styles.levelHead}>
        <span className={styles.levelScore} style={{ color }}>
          {level.score}
        </span>
      </div>
      <ul className={styles.levelList}>
        {level.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function GuideBody({
  guide,
  currentScore,
}: {
  guide: CriterionScoreGuide;
  currentScore?: number | null;
}) {
  const adjacent =
    currentScore != null && Number.isFinite(currentScore) ? adjacentScoreLevels(currentScore) : [];
  const exact =
    currentScore != null && Number.isFinite(currentScore) && Number.isInteger(Number(currentScore))
      ? (Math.round(Number(currentScore)) as CriterionScoreLevelValue)
      : null;

  return (
    <div className={styles.body}>
      <div className={styles.levels}>
        {orderedGuideLevels(guide).map((level) => {
          let tone: 'exact' | 'adjacent' | 'muted' = 'muted';
          if (exact != null && level.score === exact) tone = 'exact';
          else if (adjacent.includes(level.score)) tone = exact == null ? 'exact' : 'adjacent';
          return <LevelCard key={level.score} level={level} tone={tone} />;
        })}
      </div>
    </div>
  );
}

export function CriterionScoreGuideContent({
  criterionCode,
  currentScore,
  className,
}: {
  criterionCode: string;
  currentScore?: number | null;
  className?: string;
}): ReactNode {
  const guide = getCriterionScoreGuide(criterionCode);
  if (!guide) return null;
  return (
    <div className={[styles.contentOnly, className].filter(Boolean).join(' ')}>
      <GuideBody guide={guide} currentScore={currentScore} />
    </div>
  );
}

export function CriterionScoreGuideAccordion({
  criterionCode,
  title,
  currentScore,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  contentOnly = false,
  className,
}: CriterionScoreGuideAccordionProps) {
  const guide = getCriterionScoreGuide(criterionCode);
  const panelId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

  if (!guide) return null;

  if (contentOnly) {
    return (
      <CriterionScoreGuideContent
        criterionCode={criterionCode}
        currentScore={currentScore}
        className={className}
      />
    );
  }

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const heading = title ?? guide.title;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen(!open);
    }
  };

  return (
    <div
      className={[styles.root, open ? styles.rootOpen : '', className].filter(Boolean).join(' ')}
    >
      <button
        type='button'
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        onKeyDown={onKeyDown}
      >
        <span className={styles.triggerTitle}>{heading}</span>
        <DownOutlined className={[styles.chevron, open ? styles.chevronOpen : ''].join(' ')} />
      </button>
      {open ? (
        <div id={panelId} className={styles.panel} role='region'>
          <GuideBody guide={guide} currentScore={currentScore} />
        </div>
      ) : null}
    </div>
  );
}

export default CriterionScoreGuideAccordion;
