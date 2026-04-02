import { useQuery } from '@tanstack/react-query';

import { Contract, ContractStageState, ContractState, ContractType } from '../../types/contract';
import { PartnerCategory, PartnerCompetence, PartnerStatus, PartnerType } from '../../types/partner';
import { PatentArea } from '../../types/patent';
import { Reference } from '../../types/referenceTypes';
import { contractApi } from '../contracts/contractApi';
import { contractTypeApi } from '../contracts/contractTypeApi';
import { contractStageStateApi } from '../contractStages/contractStageStatesApi';
import { departmentApi } from '../departments/departmentApi';
import { partnerApi } from '../partners/partnerApi';
import { partnerCategoryApi } from '../partners/partnerCategoryApi';
import { partnerCompetenceApi } from '../partners/partnerCompetenceApi';
import { partnerEconomicCategoryApi } from '../partners/partnerEconomicCategoryApi';
import { partnerStatusApi } from '../partners/partnerStatusApi';
import { partnerTypeApi } from '../partners/partnerTypeApi';
import { patentApi } from '../patents/patentApi';
import { patentAreasApi } from '../patents/patentAreasApi';
import { patentIntellectPropsApi } from '../patents/patentIntellectPropsApi';
import { patentStatusesApi } from '../patents/patentStatusApi';
import { positionApi } from '../positions/positionApi';
import { projectApi } from '../projects/projectApi';
import { roleApi } from '../roles/roleApi';
import { userApi } from '../users/userApi';

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
  departments: Array<{
    id: string;
    name: string;
    short_name?: string;
  }>;
  roles: Array<{
    id: string;
    name: string;
  }>;
  positions: Array<{
    id: string;
    name: string;
  }>;
  users: Array<{
    id: string;
    name: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    code: string;
    manager_id?: string | null;
    purchaser_id?: string | null;
  }>;
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
  users: async () => {
    const { data } = await userApi.getUsers(2, false);
    return data as unknown as Array<{
      id: string;
      name: string;
    }>;
  },
  departments: () => departmentApi.getDepartments(1),
  roles: () =>
    roleApi.getRoles().then(list =>
      list.map(role => ({
        id: role.id,
        name:
          role.role_name ??
          (
            role as {
              name?: string;
            }
          ).name ??
          role.id,
      })),
    ),
  positions: () => positionApi.getPositions(1),
  projects: () => projectApi.getProjectsPreview(),
  competencies: partnerCompetenceApi.getPartnerCompetencies,
  partners: () => partnerApi.getPartnersForReference(),
  partnerCategories: partnerCategoryApi.getPartnerCategories,
  partnerTypes: partnerTypeApi.getPartnerTypes,
  partnerStatuses: partnerStatusApi.getPartnerStatuses,
  partnerEconomicCategories: partnerEconomicCategoryApi.getPartnerEconomicCategories,
  contracts: () => contractApi.getContractsForReference().then(r => r.data),
  contractStates: contractApi.getContractsStates,
  contractCategories: contractApi.getContractsCategories,
  contractTypes: contractTypeApi.getContractTypes,
  contractStageStates: contractStageStateApi.getContractStageStates,
  patents: () =>
    patentApi.getPatents({ preview: true, deletedScope: 'active' }).then(r => (Array.isArray(r) ? r : r.data)),
  patentStatuses: patentStatusesApi.getPatentStatuses,
  patentIntellectProps: patentIntellectPropsApi.getPatentIntellectProps,
  patentAreas: patentAreasApi.getPatentAreas,
};

export const useReferenceData = (neededReferences: ReferenceType[] = []) => {
  const sortedReferences = [...neededReferences].sort();
  return useQuery({
    queryKey: ['reference-data', ...sortedReferences],
    queryFn: async (): Promise<Partial<ReferenceData>> => {
      const promises = neededReferences.map(refType => {
        const apiMethod = referenceApiMethods[refType];
        return apiMethod
          ? apiMethod().then(data => ({
              type: refType,
              data,
            }))
          : Promise.resolve({ type: refType, data: [] });
      });
      const results = await Promise.allSettled(promises);
      const formattedData: Partial<ReferenceData> = {};
      results.forEach(result => {
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
