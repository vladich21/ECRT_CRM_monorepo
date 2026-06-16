import { Select } from 'antd';

import { useReferenceData } from '@/api/hooks/useReferences';

interface EmployeeSelectProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/** Выбор сотрудника(ов) из справочника пользователей (для согласующих/исполнителей). */
export function EmployeeSelect({ value, onChange, multiple, placeholder, disabled }: EmployeeSelectProps) {
  const { data, isLoading } = useReferenceData(['users']);
  const options = (data?.users ?? []).map((u) => ({ value: u.id, label: u.name }));

  return (
    <Select
      style={{ width: '100%' }}
      mode={multiple ? 'multiple' : undefined}
      showSearch
      optionFilterProp="label"
      loading={isLoading}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder ?? 'Выберите сотрудника'}
      disabled={disabled}
      allowClear
    />
  );
}
