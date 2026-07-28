import { Project } from '../../types/referenceTypes';

export const projectUpdateFormMapper = (projectData: Project) => {
  const values = {
    code: (projectData.code != null ? String(projectData.code) : '') || '',
    name: projectData.name || '',
    short_name: projectData.short_name || '',
    description: projectData.description || '',
    start_date: projectData.start_date || '',
    end_date: projectData.end_date || '',
    manager_id: projectData.manager_id || null,
    purchaser_id: projectData.purchaser_id ?? null,
    status: projectData.status || 'active',
    plan_in_gantt: projectData.plan_in_gantt !== false,
  };
  return values;
};
