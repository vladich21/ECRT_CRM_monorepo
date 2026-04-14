import { useEffect, useMemo } from 'react';

import { useContracts } from '../../../../api/contracts/contractApiHooks';
import { useFilesByEntity } from '../../../../api/files/fileApiHooks';
import { useReferenceData } from '../../../../api/hooks/useReferences';
import { usePartnerById } from '../../../../api/partners/partnerApiHooks';
import { usePartnerContacts } from '../../../../api/partners/partnerContactApiHooks';
import {
  usePartnerInitialSupplierEval,
  usePartnerSupplierEvalKpi,
  useSupplierEvaluationsList,
} from '../../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { getPartnerDetailsActiveTab } from '../../utils/partnerDetailsRouteUtils';

export function usePartnerDetailsData(partnerId: string | undefined, pathname: string) {
  const {
    data: partner,
    isLoading,
    isError: isPartnerError,
    refetch: refetchPartner,
  } = usePartnerById(partnerId ?? '');
  const { data: references } = useReferenceData(['partnerStatuses', 'partnerTypes', 'partnerCategories']);
  const { data: contacts = [] } = usePartnerContacts(partnerId);
  const { data: files = [] } = useFilesByEntity('partner', partnerId ?? '');
  const { data: contractsList } = useContracts(partnerId ? { partner_id: partnerId } : undefined, 1, 1, {
    enabled: Boolean(partnerId),
  });
  const { data: evaluationsCountData } = useSupplierEvaluationsList(
    { partner_id: partnerId, status: 'all', limit: 1, offset: 0 },
    Boolean(partnerId),
  );
  const evaluationsTotal = evaluationsCountData?.total ?? 0;
  const { data: partnerEvalKpi, isLoading: partnerEvalKpiLoading } = usePartnerSupplierEvalKpi(
    partnerId,
    Boolean(partnerId),
  );
  const { data: initialEval, isLoading: initialEvalLoading } = usePartnerInitialSupplierEval(
    partnerId,
    Boolean(partnerId),
  );

  const activeTab = useMemo(() => getPartnerDetailsActiveTab(pathname), [pathname]);

  useEffect(() => {
    if (!partnerId || isPartnerError) return;
    if (!pathname.includes(`/partners/${partnerId}/contracts`)) return;
    void refetchPartner();
  }, [partnerId, pathname, isPartnerError, refetchPartner]);

  const tabItemsWithCounts = useMemo(() => {
    return [
      { key: 'main', label: 'Основное' },
      { key: 'contacts', label: `Контактные лица (${contacts.length})` },
      { key: 'contracts', label: `Договоры (${contractsList?.total ?? 0})` },
      { key: 'evaluations', label: `Оценки (${evaluationsTotal})` },
      { key: 'comments', label: 'Комментарии' },
      { key: 'files', label: `Файлы (${files.length})` },
      { key: 'verification', label: 'Проверка' },
    ];
  }, [contacts.length, contractsList?.total, evaluationsTotal, files.length]);

  const categoryName = useMemo(() => {
    if (!partner || !references?.partnerCategories) return null;
    return (
      references.partnerCategories.find(
        category => String(category.id) === String(partner.category_id),
      )?.name ?? null
    );
  }, [partner, references?.partnerCategories]);

  const statusName = useMemo(() => {
    if (!partner || !references?.partnerStatuses) return undefined;
    return references.partnerStatuses.find(status => status.id === partner.status_id)?.name;
  }, [partner, references?.partnerStatuses]);

  return {
    partner,
    isLoading,
    isError: isPartnerError,
    refetchPartner,
    references,
    contacts,
    files,
    contractsList,
    evaluationsTotal,
    partnerEvalKpi,
    partnerEvalKpiLoading,
    initialEval,
    initialEvalLoading,
    activeTab,
    tabItemsWithCounts,
    categoryName,
    statusName,
  };
}
