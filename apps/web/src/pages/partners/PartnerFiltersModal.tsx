import type { ReactNode } from 'react';
import { Button, Col, Modal, Radio, Row, Select, Tooltip, Typography } from 'antd';

import styles from './PartnersListPage.module.scss';

const { Title } = Typography;

export type PartnerTriState = 'all' | 'yes' | 'no';

export type PartnerEvaluationCategoryFilterValue = 'A' | 'B' | 'C' | 'D' | 'none';

export type PartnerFilters = {
  typeIds: string[];
  statusIds: string[];
  competenceIds: string[];
  categoryIds: string[];
  evaluationCategoryTokens: PartnerEvaluationCategoryFilterValue[];
  evaluationRequired: PartnerTriState;
  isKeySupplier: PartnerTriState;
  isTargeted: PartnerTriState;
  reevaluationOverdue: PartnerTriState;
  hasActiveBlocks: PartnerTriState;
  isApproved: PartnerTriState;
  legalCheckPassed: PartnerTriState;
  questionnaireFilled: PartnerTriState;
  initialAssessmentDone: PartnerTriState;
};

export const EMPTY_FILTERS: PartnerFilters = {
  typeIds: [],
  statusIds: [],
  competenceIds: [],
  categoryIds: [],
  evaluationCategoryTokens: [],
  evaluationRequired: 'all',
  isKeySupplier: 'all',
  isTargeted: 'all',
  reevaluationOverdue: 'all',
  hasActiveBlocks: 'all',
  isApproved: 'all',
  legalCheckPassed: 'all',
  questionnaireFilled: 'all',
  initialAssessmentDone: 'all',
};

const BLOCKS_FILTER_HINT =
  'Все — фильтр не применяется. Да — у контрагента есть хотя бы одна активная блокировка по какому-либо проекту (участие в закупках по этому проекту ограничено). Нет — активных блокировок нет.';

const EVAL_CATEGORY_OPTIONS: { label: string; value: PartnerEvaluationCategoryFilterValue }[] = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'C', value: 'C' },
  { label: 'D', value: 'D' },
  { label: 'Без оценки', value: 'none' },
];

type SelectOption = {
  label: string;
  value: string;
};
type Props = {
  open: boolean;
  draftFilters: PartnerFilters;
  onUpdateDraftFilter: (patch: Partial<PartnerFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: {
    types: SelectOption[];
    statuses: SelectOption[];
    competencies: SelectOption[];
    partnerCategories: SelectOption[];
  };
};

const NULL_CATEGORY_OPTION = { label: 'Без категории', value: 'null' } as const;

export function PartnerFiltersModal({
  open,
  draftFilters,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
  selectOptions,
}: Props) {
  const footer: ReactNode[] = [
    <Button key='reset' onClick={onReset}>
      Сбросить
    </Button>,
    <Button key='cancel' onClick={onClose}>
      Отмена
    </Button>,
    <Button key='apply' type='primary' onClick={onApply}>
      Применить
    </Button>,
  ];
  return (
    <Modal
      title='Фильтры контрагентов'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      width={1024}
      destroyOnHidden
      footer={footer}
      styles={{ body: { paddingTop: 6 } }}
    >
      <Title level={5} className={styles.filtersModalSectionTitle}>
        Классификация
      </Title>
      <Row gutter={[12, 12]} className={styles.filtersModalCompactRow}>
        <Col xs={24} sm={12} xl={6}>
          <FilterField label='Тип контрагента'>
            <Select
              mode='multiple'
              className={styles.filtersModalControlCompact}
              placeholder='Все типы'
              allowClear
              maxTagCount='responsive'
              options={selectOptions.types}
              value={draftFilters.typeIds}
              onChange={value => onUpdateDraftFilter({ typeIds: value })}
            />
          </FilterField>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <FilterField label='Статус'>
            <Select
              mode='multiple'
              className={styles.filtersModalControlCompact}
              placeholder='Все статусы'
              allowClear
              maxTagCount='responsive'
              options={selectOptions.statuses}
              value={draftFilters.statusIds}
              onChange={value => onUpdateDraftFilter({ statusIds: value })}
            />
          </FilterField>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <FilterField label='Компетенции'>
            <Select
              mode='multiple'
              className={styles.filtersModalControlCompact}
              placeholder='Все компетенции'
              allowClear
              maxTagCount='responsive'
              options={selectOptions.competencies}
              value={draftFilters.competenceIds}
              onChange={value => onUpdateDraftFilter({ competenceIds: value })}
            />
          </FilterField>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <FilterField label='Категория контрагента'>
            <Select
              mode='multiple'
              className={styles.filtersModalControlCompact}
              placeholder='Все'
              allowClear
              maxTagCount='responsive'
              options={[...selectOptions.partnerCategories, NULL_CATEGORY_OPTION]}
              value={draftFilters.categoryIds}
              onChange={value => onUpdateDraftFilter({ categoryIds: value })}
            />
          </FilterField>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <FilterField label='Категория оценки'>
            <Select
              mode='multiple'
              className={styles.filtersModalControlCompact}
              placeholder='Все'
              allowClear
              maxTagCount='responsive'
              options={EVAL_CATEGORY_OPTIONS}
              value={draftFilters.evaluationCategoryTokens}
              onChange={value =>
                onUpdateDraftFilter({
                  evaluationCategoryTokens: (value ?? []) as PartnerEvaluationCategoryFilterValue[],
                })
              }
            />
          </FilterField>
        </Col>
      </Row>

      <Title level={5} className={styles.filtersModalSectionTitle}>
        Флаги, статус и допуск
      </Title>
      <Row gutter={[16, 16]} className={styles.filtersModalCompactRow}>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.filtersModalStackCol}>
            <TriRadioRow
              label='Требуется оценка'
              value={draftFilters.evaluationRequired}
              onChange={nextValue => onUpdateDraftFilter({ evaluationRequired: nextValue })}
            />
            <TriRadioRow
              label='Ключевой поставщик'
              value={draftFilters.isKeySupplier}
              onChange={nextValue => onUpdateDraftFilter({ isKeySupplier: nextValue })}
            />
            <TriRadioRow
              label='Целевой поставщик'
              value={draftFilters.isTargeted}
              onChange={nextValue => onUpdateDraftFilter({ isTargeted: nextValue })}
            />
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.filtersModalStackCol}>
            <TriRadioRow
              label='Юридическая проверка'
              value={draftFilters.legalCheckPassed}
              onChange={nextValue => onUpdateDraftFilter({ legalCheckPassed: nextValue })}
            />
            <TriRadioRow
              label='Анкета'
              value={draftFilters.questionnaireFilled}
              onChange={nextValue => onUpdateDraftFilter({ questionnaireFilled: nextValue })}
            />
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.filtersModalStackCol}>
            <TriRadioRow
              label='Первичная оценка'
              value={draftFilters.initialAssessmentDone}
              onChange={nextValue => onUpdateDraftFilter({ initialAssessmentDone: nextValue })}
            />
            <TriRadioRow
              label='Переоценка просрочена'
              value={draftFilters.reevaluationOverdue}
              onChange={nextValue => onUpdateDraftFilter({ reevaluationOverdue: nextValue })}
            />
          </div>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <div className={styles.filtersModalStackCol}>
            <TriRadioRow
              label='Есть блокировки'
              labelHint={BLOCKS_FILTER_HINT}
              value={draftFilters.hasActiveBlocks}
              onChange={nextValue => onUpdateDraftFilter({ hasActiveBlocks: nextValue })}
            />
            <TriRadioRow
              label='Утвержден'
              value={draftFilters.isApproved}
              onChange={nextValue => onUpdateDraftFilter({ isApproved: nextValue })}
            />
          </div>
        </Col>
      </Row>
    </Modal>
  );
}

function FilterField({
  label,
  labelHint,
  children,
}: {
  label: string;
  labelHint?: string;
  children: ReactNode;
}) {
  const labelNode = labelHint ? (
    <Tooltip title={labelHint} placement='topLeft'>
      <span className={`${styles.filtersModalLabel} ${styles.filtersModalLabelHint}`}>{label}</span>
    </Tooltip>
  ) : (
    <span className={styles.filtersModalLabel}>{label}</span>
  );
  return (
    <div className={styles.filtersModalField}>
      {labelNode}
      {children}
    </div>
  );
}

function TriRadioRow({
  label,
  labelHint,
  value,
  onChange,
}: {
  label: string;
  labelHint?: string;
  value: PartnerTriState;
  onChange: (nextValue: PartnerTriState) => void;
}) {
  return (
    <FilterField label={label} labelHint={labelHint}>
      <Radio.Group
        className={styles.filtersModalTriRadio}
        optionType='button'
        value={value}
        onChange={e => onChange(e.target.value as PartnerTriState)}
      >
        <Radio.Button value='all'>Все</Radio.Button>
        <Radio.Button value='yes'>Да</Radio.Button>
        <Radio.Button value='no'>Нет</Radio.Button>
      </Radio.Group>
    </FilterField>
  );
}
