import { Department } from '../../types/referenceTypes';

export const departmentUpdateFormMapper = (departmentData: Department) => ({
  name: departmentData.name || '',
});
