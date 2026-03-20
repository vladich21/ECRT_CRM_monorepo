import { Button, DatePicker, Modal, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import type { ProjectAdvancedFilters } from './ProjectsListPage.types';
import { END_DATE_PRESENCE_OPTIONS } from './ProjectsListPage.types';
import styles from './ProjectsListPage.module.scss';

type SelectOption = { label: string; value: string };

type Props = {
  open: boolean;
  draftFilters: ProjectAdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<ProjectAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: { managers: SelectOption[]; creators: SelectOption[] };
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
      width={900}
      destroyOnHidden
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
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Кто создал</span>
          <Select
            className={styles.filtersModalControl}
            placeholder="Все пользователи"
            allowClear
            showSearch
            optionFilterProp="label"
            options={selectOptions.creators}
            value={draftFilters.createdById ?? undefined}
            onChange={(value) => onUpdateDraftFilter({ createdById: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Пересечение сроков с периодом</span>
          <DatePicker.RangePicker
            className={styles.filtersModalControl}
            placeholder={['Дата с', 'Дата по']}
            format="DD.MM.YYYY"
            value={draftFilters.overlapRange}
            onChange={(dates) =>
              onUpdateDraftFilter({ overlapRange: dates as [Dayjs, Dayjs] | null })
            }
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Дата начала проекта</span>
          <DatePicker.RangePicker
            className={styles.filtersModalControl}
            placeholder={['С', 'По']}
            format="DD.MM.YYYY"
            value={draftFilters.startDateRange}
            onChange={(dates) =>
              onUpdateDraftFilter({ startDateRange: dates as [Dayjs, Dayjs] | null })
            }
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Дата окончания</span>
          <DatePicker.RangePicker
            className={styles.filtersModalControl}
            placeholder={['С', 'По']}
            format="DD.MM.YYYY"
            value={draftFilters.endDateRange}
            onChange={(dates) =>
              onUpdateDraftFilter({ endDateRange: dates as [Dayjs, Dayjs] | null })
            }
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Наличие даты окончания</span>
          <Select
            className={styles.filtersModalControl}
            options={END_DATE_PRESENCE_OPTIONS}
            value={draftFilters.endDatePresence}
            onChange={(value) =>
              onUpdateDraftFilter({ endDatePresence: value })
            }
          />
        </div>
      </div>
    </Modal>
  );
}
