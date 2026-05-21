import { Link } from 'react-router-dom';

import { usePartnerById } from '../../../../api/partners/partnerApiHooks';
import { Reference } from '../../../../types/referenceTypes';
import { getPartnerDisplayLabel } from '../utils/patentGrantCardHelpers';
import styles from './PatentGrantMainInfoTab.module.scss';

const linkClass = `${styles.infoValue} ${styles.infoValueWide} ${styles.registryLink} ${styles.licenseeLink}`;

function PartnerLink({
  partnerId,
  partners,
  backPath,
}: {
  partnerId: string;
  partners?: Reference[];
  backPath: string;
}) {
  const fromList = getPartnerDisplayLabel(partners?.find(row => row.id === partnerId));
  const needFetch = Boolean(partnerId && !fromList);
  const { data: fetched } = usePartnerById(needFetch ? partnerId : '');
  const label = fromList || getPartnerDisplayLabel(fetched) || (needFetch && !fetched ? '…' : '—');

  return (
    <Link to={`/partners/${partnerId}`} state={{ returnToAfterPartner: backPath }} className={linkClass}>
      {label}
    </Link>
  );
}

export function LicenseeLinks({
  partnerIds,
  partners,
  backPath,
}: {
  partnerIds: string[];
  partners?: Reference[];
  backPath: string;
}) {
  if (partnerIds.length === 0) {
    return <span className={styles.infoValueMuted}>Не указан</span>;
  }

  return (
    <div className={styles.licenseeLinks}>
      {partnerIds.map(partnerId => (
        <PartnerLink key={partnerId} partnerId={partnerId} partners={partners} backPath={backPath} />
      ))}
    </div>
  );
}
