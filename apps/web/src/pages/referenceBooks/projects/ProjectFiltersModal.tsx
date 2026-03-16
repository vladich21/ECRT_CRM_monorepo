import { Button, Modal, Select } from 'antd';
import type { ProjectAdvancedFilters } from './ProjectsListPage.types';
import styles from './ProjectsListPage.module.scss';

type SelectOption = { label: string; value: string };

type Props = {
  open: boolean;
  draftFilters: ProjectAdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<ProjectAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: { managers: SelectOption[] };
};

export function ProjectFiltersModal({
  open, draftFilters, onUpdateDraftFilter, onClose, onApply, onReset, selectOptions,
}: Props) {
  return (
    <Modal
      title="Фильтры проектов"
      open={open}
      onCancel={onClose}
      onOk={onApply}
      okText="Применить"
      cancelText="Отмена"
      width={640}
      destroyOnClose
      footer={[
        <Button key="reset" onClick={onReset}>Сбросить</Button>,
        <Button key="cancel" onClick={onClose}>Отмена</Button>,
        <Button key="apply" type="primary" onClick={onApply}>Применить</Button>,
      ]}
    >
      <div className={styles.filtersModalGrid}>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Руководитель</span>
          <Select
            className={styles.filtersModalControl}
            placeholder="Все руководители"
            allowClear
            showSearch
            optionFilterProp="label"
            options={selectOptions.managers}
            value={draftFilters.managerId ?? undefined}
            onChange={(value) => onUpdateDraftFilter({ managerId: value ?? null })}
          />
        </div>
      </div>
    </Modal>
  );
}
