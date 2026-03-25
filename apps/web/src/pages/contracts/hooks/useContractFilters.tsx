import { CalculatorOutlined, FileTextOutlined, NumberOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { FilterFieldConfig } from '../../../components/basicFilters/BasicFilters';

export const useContractFilters = () => {
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['partners', 'contractCategories', 'contractStates']);

  const filterConfig: FilterFieldConfig[] = [
    {
      key: 'search',
      label: 'Поиск',
      type: 'search',
      placeholder: 'Поиск по номеру, шифру договора...',
      width: 300,
    },
    {
      key: 'date_range',
      label: 'Период',
      type: 'date-range',
      placeholder: 'Диапазон дат',
      icon: <FileTextOutlined />,
    },
    {
      key: 'partner_id',
      label: 'Контрагент',
      type: 'select',
      options: referenceBooks?.partners?.map(partner => ({
        name: partner.name,
        id: partner.id,
      })),
      placeholder: 'Выберите контрагента',
      icon: <UserOutlined />,
    },
    {
      key: 'category_id',
      label: 'Категория',
      type: 'multi-select',
      options: referenceBooks?.contractCategories?.map(category => ({
        name: category.name,
        id: category.id,
      })),
      placeholder: 'Выберите категории',
      icon: <FileTextOutlined />,
    },
    {
      key: 'amount_range',
      label: 'Сумма с НДС',
      type: 'number-range',
      placeholder: 'Выберите диапазон',
      icon: <CalculatorOutlined />,
    },
    {
      key: 'state_id',
      label: 'Статус',
      type: 'multi-select',
      options: referenceBooks?.contractStates?.map(state => ({
        name: state.name,
        id: state.id,
      })),
      placeholder: 'Выберите статусы',
      icon: <FileTextOutlined />,
    },
    {
      key: 'is_active',
      label: 'Активность',
      type: 'multi-select',
      options: [
        { name: 'Активный', id: 'true' },
        { name: 'Неактивный', id: 'false' },
      ],
      placeholder: 'Состояние',
    },
  ];

  return {
    filterConfig,
    isReferencesLoading,
    isReferencesError,
  };
};
