// hooks/useReferenceData.ts
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
  // preview=2 — все пользователи (включая неактивных), чтобы отображать ответственных в договорах
  users: () => userApi.getUsers(2),
  departments: () => departmentApi.getDepartments(1),
  roles: roleApi.getRoles,
  positions: () => positionApi.getPositions(1),
  projects: () => projectApi.getProjects(1),
  competencies: partnerCompetenceApi.getPartnerCompetencies,

  partners: () => partnerApi.getPartners(1),
  partnerTypes: partnerTypeApi.getPartnerTypes,
  partnerStatuses: partnerStatusApi.getPartnerStatuses,
  partnerEconomicCategories: partnerEconomicCategoryApi.getPartnerEconomicCategories,

  contracts: contractApi.getContracts,
  contractStates: contractApi.getContractsStates,
  contractCategories: contractApi.getContractsCategories,
  contractTypes: contractTypeApi.getContractTypes,

  contractStageStates: contractStageStateApi.getContractStageStates,

  patents: () => patentApi.getPatents(false, true),
  patentStatuses: patentStatusesApi.getPatentStatuses,
  patentIntellectProps: patentIntellectPropsApi.getPatentIntellectProps,
  patentAreas: patentAreasApi.getPatentAreas,
};

export const useReferenceData = (neededReferences: ReferenceType[] = []) => {
  return useQuery({
    queryKey: ['reference-data', ...neededReferences.sort()],
    queryFn: async (): Promise<Partial<ReferenceData>> => {
      // Создаем промисы только для нужных справочников
      const promises = neededReferences.map(refType => {
        const apiMethod = referenceApiMethods[refType];
        return apiMethod
          ? apiMethod().then(data => ({
              type: refType,
              data,
            }))
          : Promise.resolve({ type: refType, data: [] });
      });

      // Выполняем запросы параллельно
      const results = await Promise.allSettled(promises);

      // Собираем результаты
      const formattedData: Partial<any> = {};

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { type, data } = result.value;
          formattedData[type] = data;
        }
      });

      return formattedData;
    },
    enabled: neededReferences.length > 0,
  });
};
