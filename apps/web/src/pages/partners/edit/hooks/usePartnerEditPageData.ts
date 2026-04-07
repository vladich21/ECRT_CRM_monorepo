import type { FormInstance } from 'antd/es/form';
import { useMemo } from 'react';

import { useReferenceData } from '../../../../api/hooks/useReferences';
import { usePartnerById } from '../../../../api/partners/partnerApiHooks';
import {
  usePartnerInitialSupplierEval,
  usePartnerSupplierEvalKpi,
} from '../../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { Partner } from '../../../../types/partner';
import { usePartnerEditFormWatchers } from './usePartnerEditFormWatchers';
import { buildPartnerEditHeaderLabels } from '../utils/buildPartnerEditHeaderLabels';

const REFERENCE_KEYS = [
  'partnerCategories',
  'partnerTypes',
  'partnerStatuses',
  'competencies',
  'partnerEconomicCategories',
] as const;

export function usePartnerEditPageData(partnerId: string | undefined, form: FormInstance) {
  const watchers = usePartnerEditFormWatchers(form);
  const { data: partner, isLoading: isPartnerLoading, isError: isPartnerError } = usePartnerById(partnerId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData([...REFERENCE_KEYS]);
  const { data: partnerEvalKpi, isLoading: partnerEvalKpiLoading } = usePartnerSupplierEvalKpi(
    partnerId,
    Boolean(partnerId),
  );
  const { data: initialEval, isLoading: initialEvalLoading } = usePartnerInitialSupplierEval(
    partnerId,
    Boolean(partnerId),
  );

  const displayPartner: Partner | null = useMemo(() => {
    if (!partner) return null;
    return {
      ...partner,
      inn: watchers.inn ?? partner.inn,
      short_name: watchers.short_name ?? partner.short_name,
      name: watchers.name ?? partner.name,
      type_ids: watchers.type_ids ?? partner.type_ids,
      actual_address: watchers.actual_address ?? partner.actual_address,
      is_key_supplier: watchers.is_key_supplier ?? partner.is_key_supplier,
      is_targeted: watchers.is_targeted ?? partner.is_targeted,
    };
  }, [
    partner,
    watchers.inn,
    watchers.short_name,
    watchers.name,
    watchers.type_ids,
    watchers.actual_address,
    watchers.is_key_supplier,
    watchers.is_targeted,
  ]);

  const headerLabels = useMemo(() => {
    if (!partner || !referenceBooks || !displayPartner) return null;
    return buildPartnerEditHeaderLabels(displayPartner, partner, referenceBooks, watchers.category_id);
  }, [partner, referenceBooks, displayPartner, watchers.category_id]);

  return {
    partner,
    referenceBooks,
    displayPartner,
    headerLabels,
    watchers,
    isPartnerLoading,
    isPartnerError,
    isReferencesLoading,
    isReferencesError,
    partnerEvalKpi,
    partnerEvalKpiLoading,
    initialEval,
    initialEvalLoading,
  };
}
