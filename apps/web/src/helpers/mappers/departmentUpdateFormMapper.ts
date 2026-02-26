import { Department } from '../../types/referenceTypes';

export const departmentUpdateFormMapper = (departmentData: Department) => {
  const values = {
    name: departmentData.name || '',
    short_name: departmentData.short_name || '',
    is_active: departmentData.is_active ?? true,
    manager_id: departmentData.manager_id || null,
    parent_id: departmentData.parent_id || null,
  };
  return values;
};
