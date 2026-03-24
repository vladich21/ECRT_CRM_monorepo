import type { ReactNode } from 'react';

import styles from './ReferenceBookCardList.module.scss';

type Props = {
  children: ReactNode;
};
export function ReferenceBookCardList({ children }: Props) {
  return <div className={styles.list}>{children}</div>;
}
