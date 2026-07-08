import { Link } from 'react-router-dom';

import { formatLicenseeEntryLabel } from '@/helpers/licenseeEntryHelpers';
import type { LicenseeEntry } from '@/types/licenseeEntry';
import type { Reference } from '@/types/referenceTypes';

import styles from './LicenseeEntriesDisplay.module.scss';

type Props = {
  entries: LicenseeEntry[];
  partners?: Reference[];
  backPath: string;
};

function resolveEntryLabel(entry: LicenseeEntry, partners?: Reference[]): string {
  const inlineLabel = formatLicenseeEntryLabel(entry);
  if (inlineLabel) return inlineLabel;
  if (!entry.partner_id) return '-';
  const partner = partners?.find(row => row.id === entry.partner_id);
  const fullName = String(partner?.name ?? '').trim();
  const shortName = String(partner?.short_name ?? '').trim();
  return shortName || fullName || 'Контрагент';
}

export function LicenseeEntriesDisplay({ entries, partners, backPath }: Props) {
  if (entries.length === 0) {
    return <span className={styles.valueMuted}>Не указан</span>;
  }

  return (
    <div className={styles.links}>
      {entries.map((entry, index) => {
        const label = resolveEntryLabel(entry, partners);
        const key = `${entry.partner_id ?? 'manual'}-${entry.name}-${entry.inn ?? ''}-${index}`;
        if (entry.partner_id) {
          return (
            <Link
              key={key}
              to={`/partners/${entry.partner_id}`}
              state={{ returnToAfterPartner: backPath }}
              className={styles.link}
            >
              {label}
            </Link>
          );
        }
        return (
          <span key={key} className={styles.value}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
