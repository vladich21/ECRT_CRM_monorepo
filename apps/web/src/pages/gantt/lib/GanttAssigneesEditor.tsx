import { Select } from 'antd';
import { registerEditorItem } from '@svar-ui/react-gantt';

type EditorOption = { id: string; label: string };

type AssigneesEditorProps = {
  value?: string[] | null;
  options?: EditorOption[];
  onChange?: (ev: { value: string[] }) => void;
  disabled?: boolean;
};

/**
 * MIT SVAR не регистрирует `comp: 'resources'` — поле рисовало только label.
 * Свой multi-select через registerEditorItem.
 */
function GanttAssigneesEditor({
  value,
  options = [],
  onChange,
  disabled,
}: AssigneesEditorProps) {
  const selected = Array.isArray(value) ? value.map(String) : [];

  return (
    <Select
      mode='multiple'
      allowClear
      showSearch
      disabled={disabled}
      style={{ width: '100%' }}
      placeholder='Выберите исполнителей'
      value={selected}
      options={options.map(opt => ({ value: opt.id, label: opt.label }))}
      optionFilterProp='label'
      maxTagCount='responsive'
      getPopupContainer={node => node.parentElement ?? document.body}
      onChange={ids => onChange?.({ value: ids.map(String) })}
    />
  );
}

let registered = false;

export function ensureAssigneesEditorRegistered() {
  if (registered) return;
  registerEditorItem('assignees', GanttAssigneesEditor);
  registered = true;
}
