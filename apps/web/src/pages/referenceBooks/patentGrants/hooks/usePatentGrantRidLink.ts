import { useMemo } from 'react';

type Options = {
  patentId?: string;
  selectedPatent?: { id: string; registration_number?: string | null } | null;
  initialPatentId?: string;
  initialRidRegNumber?: string;
};

export function usePatentGrantRidLink({
  patentId,
  selectedPatent,
  initialPatentId,
  initialRidRegNumber,
}: Options) {
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
