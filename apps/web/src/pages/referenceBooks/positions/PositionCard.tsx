import type { Position } from '@/types/referenceTypes';
import styles from './PositionsListPage.module.scss';

type Props = {
  position: Position;
};

export function PositionCard({ position }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{position.name || '-'}</div>
    </div>
  );
}
