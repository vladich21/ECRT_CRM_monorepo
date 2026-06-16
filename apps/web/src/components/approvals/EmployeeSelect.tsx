import { Select, Tag } from 'antd';

import { useReferenceData } from '@/api/hooks/useReferences';

interface EmployeeSelectProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  /** Показывать порядковые номера на выбранных (важно для шага «По очереди»). */
  ordered?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/** Выбор сотрудника(ов) из справочника пользователей (для согласующих/исполнителей). */
export function EmployeeSelect({ value, onChange, multiple, ordered, placeholder, disabled }: EmployeeSelectProps) {
  const { data, isLoading } = useReferenceData(['users']);
  const options = (data?.users ?? []).map((u) => ({ value: u.id, label: u.name }));

  const selected = Array.isArray(value) ? value : [];
  const tagRender =
    ordered && multiple
      ? (props: { label: React.ReactNode; value: string; closable: boolean; onClose: () => void }) => {
          const idx = selected.indexOf(props.value);
          return (
            <Tag
              closable={props.closable}
              onClose={props.onClose}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{ marginInlineEnd: 4 }}
            >
              {idx >= 0 ? `${idx + 1}. ` : ''}
              {props.label}
            </Tag>
          );
        }
      : undefined;

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
      tagRender={tagRender}
      placeholder={placeholder ?? 'Выберите сотрудника'}
      disabled={disabled}
      allowClear
    />
  );
}
