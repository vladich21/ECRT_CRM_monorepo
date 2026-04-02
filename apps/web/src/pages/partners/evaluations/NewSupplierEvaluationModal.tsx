import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import {
  useCreateSupplierEvaluation,
  usePartnerContractProjectsForEvaluation,
  useSupplierEvaluationCriteria,
  useSupplierEvaluationsList,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import { formatSrmUserName } from '../../../helpers/formatSrmUserName';
import useAuthStore from '../../../store/AuthStore';
import type { SupplierEvaluationCriterion } from '../../../types/supplierEvaluation';
import {
  CategoryTag,
  SCORE_STEPS,
  categoryFromWeightedScore,
  computeWeightedPreview,
  lineWeightedScore,
} from './supplierEvaluationUi';
import styles from './NewSupplierEvaluationModal.module.scss';

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  initialProjectId?: string;
  onSuccess?: () => void;
};

function defaultScores(criteria: SupplierEvaluationCriterion[]): Record<string, number> {
  return Object.fromEntries(criteria.map(criterion => [criterion.id, 4]));
}

export default function NewSupplierEvaluationModal({
  open,
  onClose,
  partnerId,
  initialProjectId,
  onSuccess,
}: Props) {
  const [form] = Form.useForm<{ evaluated_at: Dayjs; project_id: string; comment?: string }>();
  const watchedProjectId = Form.useWatch('project_id', form);
  const { data: criteria = [], isLoading: criteriaLoading } = useSupplierEvaluationCriteria();
  const { data: contractProjects = [], isLoading: projectsLoading } = usePartnerContractProjectsForEvaluation(
    partnerId,
    open,
  );
  const { data: activeForProject } = useSupplierEvaluationsList(
    {
      partner_id: partnerId,
      project_id: watchedProjectId,
      status: 'active',
      limit: 1,
      offset: 0,
    },
    open && Boolean(watchedProjectId),
  );
  const createMut = useCreateSupplierEvaluation();
  const { showNotification, contextHolder } = useNotification();
  const currentUser = useAuthStore(store => store.user);
  const [scores, setScores] = useState<Record<string, number>>({});

  const criteriaOrdered = useMemo(
    () =>
      [...criteria].sort(
        (criterionA, criterionB) => (criterionA.sort_order ?? 0) - (criterionB.sort_order ?? 0),
      ),
    [criteria],
  );

  useEffect(() => {
    if (open && criteriaOrdered.length) {
      setScores(defaultScores(criteriaOrdered));
      form.setFieldsValue({
        evaluated_at: dayjs(),
        project_id: initialProjectId ?? undefined,
        comment: undefined,
      });
    }
  }, [open, criteriaOrdered, initialProjectId, form]);

  const weighted = useMemo(
    () =>
      computeWeightedPreview(
        criteriaOrdered.map(criterion => ({ id: criterion.id, weight: criterion.weight })),
        scores,
      ),
    [criteriaOrdered, scores],
  );
  const previewCategory = categoryFromWeightedScore(weighted);

  const projectOptions = useMemo(() => {
    const base = contractProjects.map(project => ({ value: project.id, label: project.label }));
    if (initialProjectId && !base.some(option => option.value === initialProjectId)) {
      return [{ value: initialProjectId, label: `Проект ${initialProjectId}` }, ...base];
    }
    return base;
  }, [contractProjects, initialProjectId]);

  const hasActiveEvaluationForProject = Boolean(activeForProject?.data?.length);

  const handleOk = () =>
    form.validateFields().then(values => {
      if (!criteriaOrdered.length) return;
      return new Promise<void>((resolve, reject) => {
        createMut.mutate(
          {
            partner_id: partnerId,
            project_id: values.project_id,
            evaluated_at: values.evaluated_at.format('YYYY-MM-DD'),
            comment: values.comment?.trim() || undefined,
            scores: criteriaOrdered.map(criterion => ({
              criterion_id: criterion.id,
              score: scores[criterion.id] ?? 4,
            })),
          },
          {
            onSuccess: () => {
              onSuccess?.();
              onClose();
              resolve();
            },
            onError: (error: unknown) => {
              const msg =
                error && typeof error === 'object' && 'response' in error
                  ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                  : undefined;
              if (msg) showNotification('error', 'Ошибка', String(msg));
              reject(error);
            },
          },
        );
      });
    });

  return (
    <Modal
      title='Новая оценка'
      open={open}
      onCancel={onClose}
      width={720}
      style={{ top: 20 }}
      styles={{ body: { paddingTop: 8 } }}
      destroyOnHidden
      okText='Сохранить оценку'
      okButtonProps={{ disabled: projectOptions.length === 0 || !criteriaOrdered.length }}
      confirmLoading={createMut.isPending}
      onOk={handleOk}
    >
      {contextHolder}
      <Form form={form} layout='vertical' className={styles.form}>
        {!projectsLoading && contractProjects.length === 0 ? (
          <Alert
            type='warning'
            showIcon
            className={styles.alertMb}
            message={<span className={styles.alertMessage}>Нет проектов по договорам с этим контрагентом</span>}
            description='Оценку можно выставить только по проекту, который указан в действующем договоре с контрагентом.'
          />
        ) : null}
        {hasActiveEvaluationForProject ? (
          <Alert
            type='info'
            showIcon
            className={styles.alertMb}
            message='По выбранному проекту уже есть актуальная оценка'
          />
        ) : null}
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={10} md={9}>
            <Form.Item
              name='evaluated_at'
              label='Дата оценки'
              rules={[{ required: true, message: 'Укажите дату' }]}
              className={styles.formItemFlush}
            >
              <DatePicker format='DD.MM.YYYY' className={styles.fullWidth} allowClear={false} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={14} md={15}>
            <Form.Item
              name='project_id'
              label='Проект'
              rules={[{ required: true, message: 'Выберите проект' }]}
              className={styles.formItemFlush}
            >
              <Select
                showSearch
                allowClear
                placeholder='Выберите проект'
                options={projectOptions}
                loading={projectsLoading}
                optionFilterProp='label'
                className={styles.fullWidth}
                popupMatchSelectWidth={false}
                dropdownStyle={{ minWidth: 320 }}
              />
            </Form.Item>
          </Col>
        </Row>
        <div className={styles.matrix}>
          <div className={styles.matrixHeader}>
            <Text type='secondary' className={styles.matrixHeaderTitle}>
              Матрица оценки
            </Text>
            <Text type='secondary' className={styles.matrixHeaderMeta}>
              Сумма весов: 100%
            </Text>
          </div>
          <div className={styles.matrixBody}>
            {criteriaLoading ? (
              <Text type='secondary'>Загрузка критериев…</Text>
            ) : (
              <>
                <div className={styles.matrixColHeader}>
                  <div className={styles.colGrow}>Критерий</div>
                  <div className={styles.colShrink}>Шкала</div>
                  <div className={styles.colScore}>Балл</div>
                  <div className={styles.colWeighted}>× Вес</div>
                </div>
                {criteriaOrdered.map(criterion => {
                  const criterionScore = scores[criterion.id] ?? 4;
                  const weightedLineContribution = lineWeightedScore({
                    id: '',
                    criterion_id: criterion.id,
                    criterion_code: criterion.code,
                    criterion_name: criterion.name,
                    score: criterionScore,
                    criterion_weight: criterion.weight,
                    sort_order: criterion.sort_order,
                  });
                  return (
                    <div key={criterion.id} className={styles.criterionRow}>
                      <div className={styles.colGrow}>
                        <div className={styles.criterionTitle}>{criterion.name}</div>
                        <Text type='secondary' className={styles.criterionMeta}>
                          Вес {(criterion.weight * 100).toFixed(1)}%
                        </Text>
                      </div>
                      <Space size={4} wrap>
                        {SCORE_STEPS.map(scoreStep => (
                          <Button
                            key={scoreStep}
                            size='small'
                            type={scores[criterion.id] === scoreStep ? 'primary' : 'default'}
                            onClick={() =>
                              setScores(prevScores => ({ ...prevScores, [criterion.id]: scoreStep }))
                            }
                          >
                            {scoreStep}
                          </Button>
                        ))}
                      </Space>
                      <Text strong className={styles.scoreAccent}>
                        {criterionScore}
                      </Text>
                      <Text strong className={styles.weightedAccent}>
                        {weightedLineContribution.toFixed(3)}
                      </Text>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className={styles.summaryBar}>
          <Text className={styles.summaryLabel}>Итоговый балл</Text>
          <Space align='center'>
            <CategoryTag category={previewCategory} weightedScore={weighted} />
            <Text strong className={styles.summaryScore}>
              {criteriaOrdered.length ? weighted.toFixed(2) : '—'}
            </Text>
          </Space>
        </div>

        <Form.Item name='comment' label='Комментарий' className={styles.commentField}>
          <Input.TextArea rows={2} placeholder='Дополнительные замечания…' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
