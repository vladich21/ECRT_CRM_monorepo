import { CalculatorOutlined, FileTextOutlined, NumberOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { FilterFieldConfig } from '../../../components/basicFilters/BasicFilters';

export const usePartnerFilters = () => {
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies']);

  const filterConfig: FilterFieldConfig[] = [
    {
      key: 'search',
      label: 'Поиск',
      type: 'search',
      placeholder: 'Поиск по наименованию, ИНН...',
      width: 300,
    },
    {
      key: 'type_ids',
      label: 'Тип',
      type: 'multi-select',
      options: referenceBooks?.partnerTypes?.map(category => ({
        name: category.name,
        id: category.id,
      })),
      placeholder: 'Выберите типы',
      icon: <FileTextOutlined />,
    },
    {
      key: 'status_ids',
      label: 'Статус',
      type: 'multi-select',
      options: referenceBooks?.partnerStatuses?.map(category => ({
        name: category.name,
        id: category.id,
      })),
      placeholder: 'Выберите статусы',
      icon: <FileTextOutlined />,
    },
    {
      key: 'competence_ids',
      label: 'Компетенции',
      type: 'multi-select',
      options: referenceBooks?.competencies?.map(category => ({
        name: category.name,
        id: category.id,
      })),
      placeholder: 'Выберите компетенции',
      icon: <FileTextOutlined />,
    },
  ];

  return {
    filterConfig,
    isReferencesLoading,
    isReferencesError,
  };
};
