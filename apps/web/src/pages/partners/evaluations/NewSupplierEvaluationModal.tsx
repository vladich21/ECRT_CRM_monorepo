import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Typography, notification } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import {
  useCreateSupplierEvaluation,
  usePartnerContractProjectsForEvaluation,
  useSupplierEvaluationCriteria,
  useSupplierEvaluationDetail,
  useSupplierEvaluationsList,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import type {
  SupplierEvaluationCriterion,
  SupplierEvaluationDetail,
  SupplierEvaluationScoreDetail,
} from '../../../types/supplierEvaluation';
import { readAxiosLikeError } from '../../../utils/readAxiosLikeError';
import { shouldShowSupplierEvaluationModalNoProjectsWarning } from '../../supplierEvaluations/supplierEvaluationsRegistry.model';
import {
  CategoryTag,
  SCORE_STEPS,
  categoryFromWeightedScore,
  computeWeightedPreview,
  formatEvaluationScoreDisplay,
  resolveCriterionWeightAtEvaluation,
  weightPercent,
  weightedLineFromScoreAndWeight,
} from './supplierEvaluationUi';
import styles from './NewSupplierEvaluationModal.module.scss';

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  initialProjectId?: string;
  /** Подпись проекта, если id есть в форме, но проекта ещё нет в списке по договорам (иначе показывали бы UUID). */
  initialProjectLabel?: string;
  onSuccess?: () => void;
};

function defaultScores(criteria: SupplierEvaluationCriterion[]): Record<string, number> {
  return Object.fromEntries(criteria.map(criterion => [criterion.id, 4]));
}

/** Строки оценки из API — только если деталь относится к выбранному контрагенту и проекту. */
function pickFrozenScoreLines(
  seedDetail: SupplierEvaluationDetail | null | undefined,
  partnerId: string,
  listProjectId: string | undefined,
): SupplierEvaluationScoreDetail[] | undefined {
  if (!seedDetail || !listProjectId) return undefined;
  if (seedDetail.partner_id !== partnerId || seedDetail.project_id !== listProjectId) return undefined;
  return seedDetail.scores;
}

/** Баллы по критериям: дефолт 4, затем перекрытие из сохранённой оценки. */
function scoresMapFromSeed(
  criteriaOrdered: SupplierEvaluationCriterion[],
  seedLines: SupplierEvaluationScoreDetail[] | undefined,
): Record<string, number> {
  const next = defaultScores(criteriaOrdered);
  if (!seedLines?.length) return next;
  for (const line of seedLines) {
    next[line.criterion_id] = Number(line.score);
  }
  return next;
}

function scoresMatchFrozenLines(
  currentScores: Record<string, number>,
  frozenLines: SupplierEvaluationScoreDetail[] | undefined,
): boolean {
  if (!frozenLines?.length) return false;
  return frozenLines.every(line => Number(currentScores[line.criterion_id]) === Number(line.score));
}

export default function NewSupplierEvaluationModal({
  open,
  onClose,
  partnerId,
  initialProjectId,
  initialProjectLabel,
  onSuccess,
}: Props) {
  const [form] = Form.useForm<{ evaluated_at: Dayjs; project_id: string; comment?: string }>();
  const watchedProjectId = Form.useWatch('project_id', form);
  const listProjectId = watchedProjectId || initialProjectId;

  const { data: criteria = [], isLoading: criteriaLoading } = useSupplierEvaluationCriteria();
  const { data: contractProjects = [], isLoading: projectsLoading } = usePartnerContractProjectsForEvaluation(
    partnerId,
    open,
  );

  const {
    data: activeForProject,
    isPending: activeListPending,
    isFetching: activeListFetching,
  } = useSupplierEvaluationsList(
    {
      partner_id: partnerId,
      project_id: listProjectId,
      status: 'active',
      limit: 1,
      offset: 0,
    },
    open && Boolean(listProjectId),
  );

  const activeEvalId = activeForProject?.data?.[0]?.id;
  const { data: seedDetail, isFetching: seedDetailFetching } = useSupplierEvaluationDetail(
    activeEvalId,
    open && Boolean(listProjectId) && Boolean(activeEvalId),
  );

  const createMut = useCreateSupplierEvaluation();
  const { showNotification, contextHolder } = useNotification();
  const [scores, setScores] = useState<Record<string, number>>({});

  const criteriaOrdered = useMemo(
    () =>
      [...criteria].sort(
        (criterionA, criterionB) => (criterionA.sort_order ?? 0) - (criterionB.sort_order ?? 0),
      ),
    [criteria],
  );

  const frozenScoreLines = useMemo(
    () => pickFrozenScoreLines(seedDetail, partnerId, listProjectId),
    [seedDetail, partnerId, listProjectId],
  );

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setScores({});
      return;
    }
    if (initialProjectId) {
      form.setFieldsValue({ project_id: initialProjectId });
    }
  }, [open, initialProjectId, form]);

  useEffect(() => {
    if (!open || !criteriaOrdered.length) return;

    if (!listProjectId) {
      setScores({});
      form.setFieldsValue({ evaluated_at: dayjs(), comment: undefined });
      return;
    }

    if (activeListPending || activeListFetching) return;

    const activeRow = activeForProject?.data?.[0];
    if (activeRow?.id) {
      if (seedDetailFetching || !seedDetail) return;
      const lines = pickFrozenScoreLines(seedDetail, partnerId, listProjectId);
      if (!lines?.length) return;

      setScores(scoresMapFromSeed(criteriaOrdered, lines));
      form.setFieldsValue({
        evaluated_at: dayjs(),
        comment: seedDetail.comment?.trim() ? seedDetail.comment : undefined,
      });
      return;
    }

    setScores(defaultScores(criteriaOrdered));
    form.setFieldsValue({
      evaluated_at: dayjs(),
      comment: undefined,
    });
  }, [
    open,
    partnerId,
    criteriaOrdered,
    listProjectId,
    activeListPending,
    activeListFetching,
    activeForProject?.data,
    activeEvalId,
    seedDetailFetching,
    seedDetail,
    form,
  ]);

  const weightedTotal = useMemo(
    () =>
      computeWeightedPreview(
        criteriaOrdered.map(criterion => ({ id: criterion.id, weight: criterion.weight })),
        scores,
        frozenScoreLines,
      ),
    [criteriaOrdered, scores, frozenScoreLines],
  );

  const hasActiveEvaluationForProject = Boolean(activeForProject?.data?.length);

  const summaryWeighted = useMemo(() => {
    if (
      hasActiveEvaluationForProject &&
      seedDetail &&
      scoresMatchFrozenLines(scores, frozenScoreLines)
    ) {
      return Number(seedDetail.weighted_score);
    }
    return weightedTotal;
  }, [hasActiveEvaluationForProject, seedDetail, scores, frozenScoreLines, weightedTotal]);

  const summaryCategory = useMemo(() => {
    if (
      hasActiveEvaluationForProject &&
      seedDetail &&
      scoresMatchFrozenLines(scores, frozenScoreLines) &&
      seedDetail.category
    ) {
      return seedDetail.category;
    }
    return categoryFromWeightedScore(weightedTotal);
  }, [hasActiveEvaluationForProject, seedDetail, scores, frozenScoreLines, weightedTotal]);

  const projectOptions = useMemo(() => {
    const base = contractProjects.map(project => ({ value: project.id, label: project.label }));
    const extraId = listProjectId;
    if (extraId && !base.some(option => option.value === extraId)) {
      const labelFromParent = extraId === initialProjectId ? initialProjectLabel?.trim() : undefined;
      const fallbackLabel = labelFromParent || `Проект ${extraId}`;
      return [{ value: extraId, label: fallbackLabel }, ...base];
    }
    return base;
  }, [contractProjects, listProjectId, initialProjectId, initialProjectLabel]);

  const modalTitle = hasActiveEvaluationForProject ? 'Переоценка' : 'Новая оценка';

  const showNoContractProjectsWarning = shouldShowSupplierEvaluationModalNoProjectsWarning(
    projectsLoading,
    projectOptions.length,
  );

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
              const successMessage = hasActiveEvaluationForProject
                ? 'Переоценка поставщика успешно сохранена'
                : 'Оценка поставщика успешно сохранена';
              notification.success({ message: 'Успех', description: successMessage });
              onSuccess?.();
              onClose();
              resolve();
            },
            onError: (error: unknown) => {
              const { httpStatus, message } = readAxiosLikeError(error);
              const text = message ?? 'Не удалось сохранить оценку';
              showNotification('error', 'Ошибка', text);
              if (httpStatus === 409) {
                onClose();
              }
              reject(error);
            },
          },
        );
      });
    });

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onClose}
      width={900}
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
        {showNoContractProjectsWarning ? (
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
            message='Подставлена текущая оценка по проекту — измените баллы или дату и сохраните как новую версию.'
          />
        ) : null}
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={10} md={5}>
            <Form.Item
              name='evaluated_at'
              label='Дата оценки'
              rules={[{ required: true, message: 'Укажите дату' }]}
              className={styles.formItemFlush}
            >
              <DatePicker format='DD.MM.YYYY' className={styles.fullWidth} allowClear={false} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={14} md={19}>
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
                  const weightAtEval = resolveCriterionWeightAtEvaluation(
                    criterion.id,
                    criterion.weight,
                    frozenScoreLines,
                  );
                  const weightedLineContribution = weightedLineFromScoreAndWeight(criterionScore, weightAtEval);
                  return (
                    <div key={criterion.id} className={styles.criterionRow}>
                      <div className={styles.colGrow}>
                        <div className={styles.criterionTitle}>{criterion.name}</div>
                        <Text type='secondary' className={styles.criterionMeta}>
                          Вес {weightPercent(weightAtEval)}
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
                        {formatEvaluationScoreDisplay(weightedLineContribution)}
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
            <CategoryTag category={summaryCategory} weightedScore={summaryWeighted} />
            <Text strong className={styles.summaryScore}>
              {criteriaOrdered.length ? formatEvaluationScoreDisplay(summaryWeighted) : '—'}
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
