import { useLocation, Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/** Ссылка на контрагента с возвратом на текущий URL карточки (вкладка + раздел). */
export function PurchaseRequestPartnerLink({
  partnerId,
  children,
}: {
  partnerId: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const returnToAfterPartner = `${location.pathname}${location.search}`;

  return (
    <Link to={`/partners/${partnerId}`} state={{ returnToAfterPartner }}>
      {children}
    </Link>
  );
}
