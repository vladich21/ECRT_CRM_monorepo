import { useMemo } from 'react';
import { Contract } from '../../../types/contract';
import dayjs from 'dayjs';

export const useFilteredContracts = (contracts: Contract[], filters: Record<string, any>) => {
  const filteredContracts = useMemo(() => {
    if (!contracts.length) return [];

    return contracts.filter(contract => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          contract.number?.toLowerCase().includes(searchLower) || contract.cipher?.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;
      }

      if (filters.cipher && contract.cipher) {
        const cipherLower = filters.cipher.toLowerCase();
        if (!contract.cipher.toLowerCase().includes(cipherLower)) {
          return false;
        }
      }

      if (filters.date_range && filters.date_range.length === 2) {
        const [startDate, endDate] = filters.date_range;
        const contractDate = contract.date_signed || contract.start_date;

        if (contractDate) {
          const contractDay = dayjs(contractDate);
          const isInRange = contractDay.isAfter(startDate) && contractDay.isBefore(endDate);
          if (!isInRange) return false;
        }
      }

      if (filters.partner_id && contract.partner_id !== filters.partner_id) {
        return false;
      }

      if (filters.category_id && filters.category_id.length > 0) {
        const categoryIds = Array.isArray(filters.category_id) ? filters.category_id : [filters.category_id];

        if (!categoryIds.includes(contract.category_id)) {
          return false;
        }
      }

      if (filters.amount_range && filters.amount_range.length === 2) {
        const [minAmount, maxAmount] = filters.amount_range;
        const contractAmount = contract.amount_incl_vat || 0;

        if (minAmount && contractAmount < minAmount) return false;
        if (maxAmount && contractAmount > maxAmount) return false;
      }

      if (filters.state_id && filters.state_id.length > 0) {
        const stateIds = Array.isArray(filters.state_id) ? filters.state_id : [filters.state_id];

        if (!stateIds.includes(contract.state_id)) {
          return false;
        }
      }

      if (filters.is_active && filters.is_active.length > 0) {
        const active_ids = Array.isArray(filters.is_active)
          ? filters.is_active.map((el: string) => el === 'true')
          : [Boolean(filters.is_active)];

        if (!active_ids.includes(contract.is_active)) {
          return false;
        }
      }

      return true;
    });
  }, [contracts, filters]);

  return filteredContracts;
};
