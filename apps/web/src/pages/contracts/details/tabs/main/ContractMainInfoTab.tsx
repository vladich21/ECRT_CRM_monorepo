import { useOutletContext } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  Row,
  Descriptions,
  Progress,
  Alert,
  Button,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Tooltip,
  Typography,
} from 'antd';
import { FilterOutlined, PlusOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import type { Contract, ContractStage } from '../../../../../types/contract';
import { NotFound } from '../../../../../components/notFound/NotFound';
import { Loader } from '../../../../../components/loader/Loader';
import { useReferenceData } from '../../../../../api/hooks/useReferences';
import { formatDate } from '../stages/data';
import { buildMainInfoItems } from './contractInfoItems';
import { StageCard } from '../stages/StageCard';
import { calculateBudgetDeviation, calculateDaysUntilDeadline, getStageStatus } from '../stages/utils/stageHelpers';
import styles from '../../ContractDetails.module.scss';
import tabStyles from './ContractMainInfoTab.module.scss';

const { Text } = Typography;

const formatDateValue = (date: string | null | undefined): string =>
  date ? formatDate(date) : '-';

type OutletContext = { contract: Contract; stages: ContractStage[] };

type StageCategory = 'Документы' | 'Документация' | 'Работы' | 'Приёмка' | 'Прочее';
const STAGE_CATEGORIES: StageCategory[] = ['Документы', 'Документация', 'Работы', 'Приёмка', 'Прочее'];

type StageFilters = {
  category: StageCategory | 'all';
  status: 'all' | 'planned' | 'in_progress' | 'completed' | 'overdue';
  responsible: string | 'all';
  deadline: 'all' | 'urgent' | 'overdue';
  budget: 'all' | 'hasDeviation' | 'overBudget' | 'underBudget';
};

const DEFAULT_FILTERS: StageFilters = {
  category: 'all',
  status: 'all',
  responsible: 'all',
  deadline: 'all',
  budget: 'all',
};

function guessStageCategory(name: string): StageCategory {
  const n = (name || '').toLowerCase();
  if (n.includes('подпис') || n.includes('договор') || n.includes('акт')) return 'Документы';
  if (n.includes('документ') || n.includes('техн')) return 'Документация';
  if (n.includes('приём') || n.includes('сдач')) return 'Приёмка';
  if (n.includes('работ')) return 'Работы';
  return 'Прочее';
}

export function ContractMainInfoTab() {
  const { contract, stages = [] } = useOutletContext<OutletContext>();
  const [ui, setUi] = useState<{
    isExpanded: boolean;
    expandedStageIds: Record<string, boolean>;
    isAddStageOpen: boolean;
    isFiltersOpen: boolean;
    stageSearch: string;
  }>({
    isExpanded: true,
    expandedStageIds: {},
    isAddStageOpen: false,
    isFiltersOpen: false,
    stageSearch: '',
  });
  const [stagesState, setStagesState] = useState<ContractStage[]>(stages);
  const [stageCategories, setStageCategories] = useState<Record<string, StageCategory>>({});
  const [filters, setFilters] = useState<StageFilters>(DEFAULT_FILTERS);
  const [addStageForm] = Form.useForm();
  const [filtersForm] = Form.useForm();

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData([
    'users', 'projects', 'partners', 'contractStates', 'contractCategories', 'contractTypes', 'contractStageStates',
  ]);

  useEffect(() => {
    setStagesState(stages);
    setStageCategories((prev) => {
      const next = { ...prev };
      for (const stage of stages) {
        if (!next[stage.id]) next[stage.id] = guessStageCategory(stage.name);
      }
      return next;
    });
  }, [stages]);

  // IMPORTANT: keep all hooks (including useMemo) unconditional
  const filteredStages = useMemo(() => {
    const queryLower = ui.stageSearch.trim().toLowerCase();
    const bySearch = queryLower
      ? stagesState.filter((stage) => (stage.name || '').toLowerCase().includes(queryLower))
      : stagesState;
    const byCategory =
      filters.category === 'all'
        ? bySearch
        : bySearch.filter((stage) => stageCategories[stage.id] === filters.category);

    const byStatus =
      filters.status === 'all'
        ? byCategory
        : byCategory.filter((stage) => getStageStatus(stage, referenceBooks?.contractStageStates).status === filters.status);

    const byResponsible =
      filters.responsible === 'all'
        ? byStatus
        : byStatus.filter((stage) => String(stage.responsible_id || '') === String(filters.responsible));

    const byDeadline =
      filters.deadline === 'all'
        ? byResponsible
        : byResponsible.filter((stage) => {
            const stageStatus = getStageStatus(stage, referenceBooks?.contractStageStates);
            const days = calculateDaysUntilDeadline(stage.planned_end_date || null);
            if (filters.deadline === 'overdue') return stageStatus.status === 'overdue';
            // urgent: in progress and <= 7 days left (not overdue)
            return stageStatus.status === 'in_progress' && days <= 7 && days >= 0;
          });

    const byBudget =
      filters.budget === 'all'
        ? byDeadline
        : byDeadline.filter((stage) => {
            const dev = calculateBudgetDeviation(stage.planned_budget ?? null, stage.actual_budget ?? null);
            if (dev == null) return false;
            if (filters.budget === 'hasDeviation') return true;
            if (filters.budget === 'overBudget') return dev > 0;
            return dev < 0;
          });

    return [...byBudget].sort((stageA, stageB) => stageA.stage_number - stageB.stage_number);
  }, [
    stagesState,
    ui.stageSearch,
    filters.category,
    filters.status,
    filters.responsible,
    filters.deadline,
    filters.budget,
    stageCategories,
    referenceBooks?.contractStageStates,
  ]);

  const activeFiltersCount =
    Number(filters.category !== 'all') +
    Number(filters.status !== 'all') +
    Number(filters.responsible !== 'all') +
    Number(filters.deadline !== 'all') +
    Number(filters.budget !== 'all');

  if (isReferencesLoading) return <Loader />;
  if (isReferencesError || !referenceBooks || !contract) {
    return <NotFound errorMessage="Договор не найден" />;
  }

  const completedStagesCount = stagesState.filter((stage) => Boolean(stage.actual_end_date)).length;
  const totalProgress =
    stagesState.length > 0 ? (completedStagesCount / stagesState.length) * 100 : 0;
  const currentStageIndex = completedStagesCount + 1;

  const infoItems = buildMainInfoItems(contract, referenceBooks, formatDateValue);

  const openFilters = () => {
    filtersForm.setFieldsValue({
      category: filters.category,
      status: filters.status,
      responsible: filters.responsible,
      deadline: filters.deadline,
      budget: filters.budget,
    });
    setUi((prev) => ({ ...prev, isFiltersOpen: true }));
  };

  const applyFilters = async () => {
    const validatedValues = await filtersForm.validateFields();
    setFilters({
      category: validatedValues.category,
      status: validatedValues.status,
      responsible: validatedValues.responsible,
      deadline: validatedValues.deadline,
      budget: validatedValues.budget,
    });
    setUi((prevState) => ({ ...prevState, isFiltersOpen: false }));
  };

  const resetFilters = () => {
    filtersForm.resetFields();
    setFilters(DEFAULT_FILTERS);
    setUi((prev) => ({ ...prev, isFiltersOpen: false }));
  };

  const handleAddStage = async () => {
    const values = await addStageForm.validateFields();
    const nextNumber = (stagesState.reduce((m, s) => Math.max(m, s.stage_number), 0) || 0) + 1;
    const id = `local-stage-${Date.now()}`;
    const d = (v: any) => (v ? v.format('YYYY-MM-DD') : '');
    const newStage: ContractStage = {
      id,
      name: values.name,
      stage_number: values.stage_number ?? nextNumber,
      responsible_id: values.responsible_id ?? contract.responsible_id ?? '',
      contract_id: contract.id,
      planned_start_date: d(values.planned_start_date),
      planned_end_date: d(values.planned_end_date),
      actual_start_date: '',
      actual_end_date: '',
      planned_budget: values.planned_budget ?? 0,
      forecasted_budget: values.forecasted_budget ?? values.planned_budget ?? 0,
      actual_budget: 0,
      state_id: values.state_id ?? (referenceBooks.contractStageStates?.[0]?.id ?? ''),
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStagesState((prev) => [...prev, newStage]);
    setStageCategories((prev) => ({ ...prev, [id]: values.category }));
    addStageForm.resetFields();
    setUi((prev) => ({ ...prev, isAddStageOpen: false }));
  };

  return (
    <>
      <Card style={{ marginBottom: 14 }} styles={{ body: { padding: 0 } }}>
        <div className={tabStyles.progressSection}>
          <div className={tabStyles.progressHeader}>
            <Text style={{ fontSize: '16px' }} strong>Прогресс выполнения</Text>
            <Text type="secondary">
              Этап{' '}
              <Text strong>{Math.min(currentStageIndex, stagesState.length) || 1}</Text>
              {' '}из{' '}
              <Text strong>{stagesState.length || 1}</Text>
            </Text>
          </div>
          <Progress percent={Math.round(totalProgress)} strokeColor="#1677ff" />
        </div>

        <div
          className={`${tabStyles.sectionHeader} ${
            ui.isExpanded ? tabStyles.sectionHeaderBordered : ''
          }`}
        >
          <Text style={{ fontSize: '16px' }} strong>Основная информация</Text>
          <Button
            type="text"
            size="small"
            icon={ui.isExpanded ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setUi((prev) => ({ ...prev, isExpanded: !prev.isExpanded }))}
          >
            {ui.isExpanded ? 'Свернуть' : 'Развернуть'}
          </Button>
        </div>

        {ui.isExpanded && (
          <div className={tabStyles.sectionBody}>
            <Descriptions
              items={infoItems}
              column={3}
              size="small"
              layout="vertical"
              colon={false}
              classNames={{
                label: tabStyles.descLabel,
                content: tabStyles.descContent,
              }}
            />

            {contract.description && (
              <Collapse
                ghost
                size="small"
                defaultActiveKey={['desc']}
                className={tabStyles.descriptionCollapse}
                items={[
                  {
                    key: 'desc',
                    label: <Text type="secondary" className={tabStyles.descriptionLabel}>Описание</Text>,
                    children: (
                      <Text className={tabStyles.descriptionText}>
                        {contract.description}
                      </Text>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Card>

      <Card
        title="Этапы выполнения"
        className={styles.stagesCard}
        extra={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="default"
              icon={<FilterOutlined />}
              onClick={openFilters}
              className={activeFiltersCount > 0 ? tabStyles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={tabStyles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Tooltip title="Этапы договора временно недоступны">
              <Button type="primary" icon={<PlusOutlined />} disabled>
                Добавить этап
              </Button>
            </Tooltip>
          </div>
        }
      >
        
        <div className={tabStyles.stagesToolbar}>
          <div />
          <div className={tabStyles.stagesToolbarRightWide}>
            <Input
              className={tabStyles.toolbarInput}
              placeholder="Поиск по названию этапа..."
              value={ui.stageSearch}
              allowClear
              onChange={(e) => setUi((prev) => ({ ...prev, stageSearch: e.target.value }))}
            />
            <Text type="secondary">
              Показано: <Text strong>{filteredStages.length}</Text> из{' '}
              <Text strong>{stagesState.length}</Text>
            </Text>
          </div>
        </div>
        <Alert
          message="Этапы договора пока недоступны"
          description="Функционал находится в разработке."
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
        />


      </Card>

      <Modal
        title="Фильтры этапов"
        open={ui.isFiltersOpen}
        onCancel={() => setUi((prev) => ({ ...prev, isFiltersOpen: false }))}
        destroyOnHidden
        footer={[
          <Button key="reset" onClick={resetFilters}>
            Сбросить
          </Button>,
          <Button key="cancel" onClick={() => setUi((prev) => ({ ...prev, isFiltersOpen: false }))}>
            Отмена
          </Button>,
          <Button key="ok" type="primary" onClick={applyFilters}>
            Применить
          </Button>,
        ]}
      >
        <Form
          form={filtersForm}
          layout="vertical"
          initialValues={{
            category: 'all',
            status: 'all',
            responsible: 'all',
            deadline: 'all',
            budget: 'all',
          }}
        >
          <Form.Item name="category" label="Категория">
            <Select
              options={[
                { value: 'all', label: 'Все категории' },
                ...STAGE_CATEGORIES.map((category) => ({ value: category, label: category })),
              ]}
            />
          </Form.Item>

          <Form.Item name="status" label="Статус этапа">
            <Select
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'planned', label: 'Запланирован' },
                { value: 'in_progress', label: 'В работе' },
                { value: 'completed', label: 'Завершен' },
                { value: 'overdue', label: 'Просрочен' },
              ]}
            />
          </Form.Item>

          <Form.Item name="responsible" label="Ответственный">
            <Select
              showSearch
              optionFilterProp="label"
              options={[
                { value: 'all', label: 'Все ответственные' },
                ...(referenceBooks.users ?? []).map((u: any) => ({ value: u.id, label: u.name })),
              ]}
            />
          </Form.Item>

          <Form.Item name="deadline" label="Сроки">
            <Select
              options={[
                { value: 'all', label: 'Все сроки' },
                { value: 'urgent', label: 'Срочно (≤ 7 дней)' },
                { value: 'overdue', label: 'Просрочено' },
              ]}
            />
          </Form.Item>

          <Form.Item name="budget" label="Бюджет">
            <Select
              options={[
                { value: 'all', label: 'Любой бюджет' },
                { value: 'hasDeviation', label: 'Есть отклонение' },
                { value: 'overBudget', label: 'Перерасход' },
                { value: 'underBudget', label: 'Экономия' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Добавить этап"
        open={ui.isAddStageOpen}
        onCancel={() => setUi((prev) => ({ ...prev, isAddStageOpen: false }))}
        onOk={handleAddStage}
        okText="Добавить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={addStageForm} layout="vertical">
          <Form.Item
            name="name"
            label="Название этапа"
            rules={[{ required: true, message: 'Введите название этапа' }]}
          >
            <Input placeholder="Например: Подписание договора" />
          </Form.Item>

          <Form.Item name="category" label="Категория" initialValue="Прочее" rules={[{ required: true }]}>
            <Select options={STAGE_CATEGORIES.map((category) => ({ value: category, label: category }))} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="planned_start_date" label="План: дата начала">
                {/* DatePicker locale is global via ConfigProvider */}
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="planned_end_date" label="План: дата окончания">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="planned_budget" label="Плановый бюджет">
                <InputNumber style={{ width: '100%' }} min={0} step={1000} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="forecasted_budget" label="Прогнозный бюджет">
                <InputNumber style={{ width: '100%' }} min={0} step={1000} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="responsible_id" label="Ответственный" initialValue={contract.responsible_id}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={(referenceBooks.users ?? []).map((u: any) => ({ value: u.id, label: u.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="state_id" label="Статус этапа">
                <Select
                  allowClear
                  options={(referenceBooks.contractStageStates ?? []).map((s: any) => ({ value: s.id, label: s.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="stage_number" label="Номер этапа (опционально)">
            <InputNumber style={{ width: '100%' }} min={1} step={1} precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
