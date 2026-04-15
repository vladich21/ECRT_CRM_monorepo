import { useMemo } from 'react';

import type { ReferenceDataForPatents } from '../types/data';
import type { PatentListFiltersSelectOptions } from '../types/PatentsListPage.types';

const CALENDAR_YEAR_START = 2022;
const CALENDAR_YEAR_END = 2050;

function buildCalendarYearOptions(): Array<{ label: string; value: number }> {
  const years: Array<{ label: string; value: number }> = [];
  for (let year = CALENDAR_YEAR_START; year <= CALENDAR_YEAR_END; year++) {
    years.push({ label: String(year), value: year });
  }
  return years;
}

export function usePatentsListSelectOptions(
  refs: ReferenceDataForPatents | undefined,
  contractIdsForPatentFilter: string[],
): PatentListFiltersSelectOptions {
  return useMemo(() => {
    const calendarYears = buildCalendarYearOptions();
    const contractsById = new Map((refs?.contracts ?? []).map(contract => [contract.id, contract]));
    const contracts = contractIdsForPatentFilter
      .map(contractId => {
        const contract = contractsById.get(contractId);
        if (contract) {
          const contractNumber = contract.number?.trim();
          const label = contractNumber || contract.name;
          return { label, value: contractId };
        }
        return { label: `Договор ${contractId.slice(0, 8)}…`, value: contractId };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    return {
      departments: (refs?.departments ?? []).map(department => ({
        label: department.name,
        value: department.id,
      })),
      statuses: (refs?.patentStatuses ?? []).map(status => ({
        label: status.name,
        value: status.id,
      })),
      users: (refs?.users ?? []).map(user => ({
        label: user.name,
        value: user.id,
      })),
      projects: (refs?.projects ?? []).map(project => ({
        label: project.code ? `${project.code} — ${project.name}` : project.name,
        value: project.id,
      })),
      contracts,
      applicationAreas: (refs?.patentAreas ?? []).map(area => ({
        label: area.code ? `${area.code} — ${area.name}` : area.name,
        value: area.id,
      })),
      calendarYears,
    };
  }, [refs, contractIdsForPatentFilter]);
}
