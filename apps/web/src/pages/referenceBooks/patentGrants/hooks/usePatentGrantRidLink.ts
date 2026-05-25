import { useEffect, useMemo, useRef } from 'react';
import type { FormInstance } from 'antd/es/form';

import type { Patent } from '../../../../types/patent';

type Options = {
  form: FormInstance;
  patentId?: string;
  selectedPatent?: Patent | null;
  initialPatentId?: string;
  initialRidRegNumber?: string;
};

export function usePatentGrantRidLink({
  form,
  patentId,
  selectedPatent,
  initialPatentId,
  initialRidRegNumber,
}: Options) {
  const prevPatentIdRef = useRef<string>();

  useEffect(() => {
    if (!patentId || selectedPatent?.id !== patentId) return;

    const licensees = selectedPatent.expected_licensee_partner_id?.trim()
      ? [selectedPatent.expected_licensee_partner_id.trim()]
      : [];
    const isInitial = prevPatentIdRef.current === undefined;
    const patentChanged = prevPatentIdRef.current !== patentId;

    if (isInitial) {
      const current = form.getFieldValue('expected_licensee_partner_ids') as string[] | undefined;
      if ((!current || current.length === 0) && licensees.length > 0) {
        form.setFieldValue('expected_licensee_partner_ids', licensees);
      }
    } else if (patentChanged) {
      form.setFieldValue('expected_licensee_partner_ids', licensees);
    }

    prevPatentIdRef.current = patentId;
  }, [patentId, selectedPatent, form]);

  const linkedRidRegNumber = useMemo(() => {
    if (!patentId) return '';
    if (selectedPatent?.id === patentId) {
      return selectedPatent.registration_number?.trim() || initialRidRegNumber?.trim() || '';
    }
    if (initialPatentId && patentId === initialPatentId) {
      return initialRidRegNumber?.trim() || '';
    }
    return '';
  }, [patentId, selectedPatent, initialPatentId, initialRidRegNumber]);

  return { linkedRidRegNumber };
}
