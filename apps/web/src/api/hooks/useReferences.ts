import { useQuery } from '@tanstack/react-query';
import { projectApi } from '../projects/projectApi';
import { userApi } from '../users/userApi';
import { departmentApi } from '../departments/departmentApi';
import { positionApi } from '../positions/positionApi';
import { roleApi } from '../roles/roleApi';
import { partnerTypeApi } from '../partners/partnerTypeApi';
import { partnerStatusApi } from '../partners/partnerStatusApi';
import { partnerCompetenceApi } from '../partners/partnerCompetenceApi';
import { PartnerCompetence, PartnerStatus, PartnerType } from '../../types/partner';
import { contractApi } from '../contracts/contractApi';
import { Reference } from '../../types/referenceTypes';
import { partnerApi } from '../partners/partnerApi';
import { patentStatusesApi } from '../patents/patentStatusApi';
import { patentIntellectPropsApi } from '../patents/patentIntellectPropsApi';
import { Contract, ContractStageState, ContractState, ContractType } from '../../types/contract';
import { partnerEconomicCategoryApi } from '../partners/partnerEconomicCategoryApi';
import { partnerCategoryApi } from '../partners/partnerCategoryApi';
import { PartnerCategory } from '../../types/partner';
import { patentApi } from '../patents/patentApi';
import { PatentArea } from '../../types/patent';
import { patentAreasApi } from '../patents/patentAreasApi';
import { contractTypeApi } from '../contracts/contractTypeApi';
import { contractStageStateApi } from '../contractStages/contractStageStatesApi';

export type ReferenceType =
  | 'departments'
  | 'roles'
  | 'positions'
  | 'users'
  | 'projects'
  | 'partners'
  | 'competencies'
  | 'partnerStatuses'
  | 'partnerTypes'
  | 'partnerCategories'
  | 'partnerEconomicCategories'
  | 'contracts'
  | 'contractStates'
  | 'contractCategories'
  | 'contractTypes'
  | 'contractStageStates'
  | 'patents'
  | 'patentStatuses'
  | 'patentIntellectProps'
  | 'patentAreas';

export interface ReferenceData {
  departments: Array<{ id: string; name: string; short_name?: string }>;
  roles: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; code: string }>;
  competencies: Array<PartnerCompetence>;

  partners: Array<Reference>;
  partnerCategories: Array<PartnerCategory>;
  partnerTypes: Array<PartnerType>;
  partnerStatuses: Array<PartnerStatus>;
  partnerEconomicCategories: Array<Reference>;

  contracts: Array<Contract>;
  contractStates: Array<ContractState>;
  contractCategories: Array<Reference>;
  contractTypes: Array<ContractType>;

  contractStageStates: Array<ContractStageState>;

  patents: Array<Reference>;
  patentStatuses: Array<Reference>;
  patentIntellectProps: Array<Reference>;
  patentAreas: Array<PatentArea>;
}

const referenceApiMethods = {
  // preview=2 — все пользователи (включая неактивных); для справочника подтягиваем все страницы
  users: async () => {
    const pageSize = 100; // на бэке cap=100
    const maxTotal = 10_000; // защита от случайной загрузки “всего мира”
    const all: Array<{ id: string; name: string }> = [];
    let offset = 0;

    while (true) {
      const { data, total } = await userApi.getUsers(2, false, pageSize, offset);
      all.push(...((data as unknown) as Array<{ id: string; name: string }>));
      offset += data.length;

      if (data.length === 0) break;
      if (all.length >= total) break;
      if (all.length >= maxTotal) break;
    }

    return all;
  },
  departments: () => departmentApi.getDepartments(1),
  roles: () =>
    roleApi.getRoles().then((list) =>
      list.map((role) => ({ id: role.id, name: role.role_name ?? (role as { name?: string }).name ?? role.id })),
    ),
  positions: () => positionApi.getPositions(1),
  projects: () => projectApi.getProjects(1),
  competencies: partnerCompetenceApi.getPartnerCompetencies,

  partners: () => partnerApi.getPartnersForReference(),
  partnerCategories: partnerCategoryApi.getPartnerCategories,
  partnerTypes: partnerTypeApi.getPartnerTypes,
  partnerStatuses: partnerStatusApi.getPartnerStatuses,
  partnerEconomicCategories: partnerEconomicCategoryApi.getPartnerEconomicCategories,

  // Все договоры для выпадающих списков (for_reference=1, без лимита). Ответ кэшируется на бэкенде (п. 3.2 STACK_AND_LOAD_ANALYSIS.md).
  contracts: () => contractApi.getContractsForReference().then((r) => r.data),
  contractStates: contractApi.getContractsStates,
  contractCategories: contractApi.getContractsCategories,
  contractTypes: contractTypeApi.getContractTypes,

  contractStageStates: contractStageStateApi.getContractStageStates,

  patents: () =>
    patentApi.getPatents(false, true).then((r) => (Array.isArray(r) ? r : r.data)),
  patentStatuses: patentStatusesApi.getPatentStatuses,
  patentIntellectProps: patentIntellectPropsApi.getPatentIntellectProps,
  patentAreas: patentAreasApi.getPatentAreas,
};

export const useReferenceData = (neededReferences: ReferenceType[] = []) => {
  const sortedReferences = [...neededReferences].sort();

  return useQuery({
    queryKey: ['reference-data', ...sortedReferences],
    queryFn: async (): Promise<Partial<ReferenceData>> => {
      const promises = neededReferences.map((refType) => {
        const apiMethod = referenceApiMethods[refType];
        return apiMethod
          ? apiMethod().then((data) => ({
              type: refType,
              data,
            }))
          : Promise.resolve({ type: refType, data: [] });
      });
      const results = await Promise.allSettled(promises);
      const formattedData: Partial<ReferenceData> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { type, data } = result.value;
          (formattedData as Record<ReferenceType, unknown>)[type] = data;
        }
      });

      return formattedData;
    },
    enabled: neededReferences.length > 0,
  });
};
