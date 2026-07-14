import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, DatePicker, Form, Input, Modal, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import {
  useCreateInitialSupplierEvaluation,
  useSupplierEvaluationCriteria,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useNotification } from '@/hooks/notifications/useNotification';
import { readAxiosLikeError } from '../../../utils/readAxiosLikeError';
import type { SupplierEvaluationCriterion } from '../../../types/supplierEvaluation';
import {
  GENERAL_SCORE_GUIDE_CODE,
  EvaluationMatrixCriterionRow,
} from '@/components/supplierEvaluations';
import {
  CategoryTag,
  SCORE_STEPS,
  categoryFromWeightedScore,
  formatEvaluationScoreDisplay,
  lineWeightedScore,
  weightPercent,
} from './supplierEvaluationUi';
import { getEvaluationCommentRules, requiresEvaluationComment } from './evaluationLowScore';
import { SupplierEvaluationScoreGuideTrigger } from './SupplierEvaluationScoreGuideTrigger';
import styles from './NewSupplierEvaluationModal.module.scss';

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  onSuccess?: () => void;
};

function defaultScores(criteria: SupplierEvaluationCriterion[]): Record<string, number> {
  return Object.fromEntries(criteria.map(criterion => [criterion.id, 4]));
}

export default function NewInitialSupplierEvaluationModal({ open, onClose, partnerId, onSuccess }: Props) {
  const [form] = Form.useForm<{ evaluated_at: Dayjs; comment?: string }>();
  const { data: criteria = [], isLoading: criteriaLoading } = useSupplierEvaluationCriteria();
  const createMut = useCreateInitialSupplierEvaluation();
  const { showNotification, contextHolder } = useNotification();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [expandedCriterionIds, setExpandedCriterionIds] = useState<string[]>([]);

  const criteriaOrdered = useMemo(
    () =>
      [...criteria].sort(
        (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
      ),
    [criteria],
  );

  useEffect(() => {
    if (open && criteriaOrdered.length) {
      setScores(defaultScores(criteriaOrdered));
      setExcluded(Object.fromEntries(criteriaOrdered.map(criterion => [criterion.id, false])));
      setExpandedCriterionIds([]);
      form.setFieldsValue({ evaluated_at: dayjs(), comment: undefined });
    }
  }, [open, criteriaOrdered, form]);

  const includedCriteria = useMemo(
    () => criteriaOrdered.filter(criterion => !excluded[criterion.id]),
    [criteriaOrdered, excluded],
  );

  const sumWeights = useMemo(
    () => includedCriteria.reduce((acc, criterion) => acc + Number(criterion.weight), 0),
    [includedCriteria],
  );

  const weighted = useMemo(() => {
    if (!includedCriteria.length || !Number.isFinite(sumWeights) || sumWeights <= 0) return 0;
    return includedCriteria.reduce((acc, criterion) => {
      const score = scores[criterion.id] ?? 4;
      return acc + score * (Number(criterion.weight) / sumWeights);
    }, 0);
  }, [includedCriteria, scores, sumWeights]);

  const previewCategory = categoryFromWeightedScore(weighted);

  const requiresComment = useMemo(
    () =>
      requiresEvaluationComment(
        includedCriteria.map(criterion => scores[criterion.id] ?? 4),
      ),
    [includedCriteria, scores],
  );

  const handleOk = () =>
    form.validateFields().then(values => {
      if (!includedCriteria.length) {
        showNotification('error', 'Ошибка', 'Нужно оставить минимум один критерий для оценки');
        return;
      }
      createMut.mutate(
        {
          partner_id: partnerId,
          evaluated_at: values.evaluated_at.format('YYYY-MM-DD'),
          comment: values.comment?.trim() || undefined,
          scores: includedCriteria.map(criterion => ({
            criterion_id: criterion.id,
            score: scores[criterion.id] ?? 4,
          })),
        },
        {
          onSuccess: () => {
            showNotification('success', 'Успех', 'Первичная оценка сохранена');
            onSuccess?.();
            onClose();
          },
          onError: (error: unknown) => {
            const { httpStatus, message } = readAxiosLikeError(error);
            const text = message ?? 'Не удалось сохранить оценку';
            showNotification('error', 'Ошибка', text);
            if (httpStatus === 409) {
              onClose();
            }
          },
        },
      );
    });

  return (
    <Modal
      title='Первичная оценка контрагента'
      open={open}
      onCancel={onClose}
      width={900}
      style={{ top: 20 }}
      styles={{ body: { paddingTop: 8 } }}
      destroyOnHidden
      okText='Сохранить оценку'
      confirmLoading={createMut.isPending}
      onOk={handleOk}
      okButtonProps={{ disabled: !criteriaOrdered.length }}
    >
      {contextHolder}
      <Form form={form} layout='vertical' className={styles.form}>
        <Form.Item
          name='evaluated_at'
          label='Дата оценки'
          rules={[{ required: true, message: 'Укажите дату' }]}
          className={styles.formItemFlush}
        >
          <DatePicker format='DD.MM.YYYY' className={styles.fullWidth} allowClear={false} />
        </Form.Item>

        <div className={styles.matrix}>
          <div className={styles.matrixHeader}>
            <Text type='secondary' className={styles.matrixHeaderTitle}>
              Матрица оценки
            </Text>
            <Space size={12} align='center'>
              <SupplierEvaluationScoreGuideTrigger />
              <Text type='secondary' className={styles.matrixHeaderMeta}>
                {includedCriteria.length === 0 ? 'Сумма весов: -' : 'Сумма весов: 100%'}
              </Text>
            </Space>
          </div>
          <div className={styles.matrixBody}>
            {criteriaLoading ? (
              <Text type='secondary'>Загрузка критериев…</Text>
            ) : criteriaOrdered.length === 0 ? (
              <Text type='secondary'>Нет активных критериев.</Text>
            ) : (
              <>
                <div className={styles.matrixColHeader}>
                  <div className={styles.colGrow}>Критерий</div>
                  <div className={styles.colShrink}>Шкала</div>
                  <div className={styles.colScore}>Балл</div>
                  <div className={styles.colWeighted}>× Вес</div>
                  <div className={styles.colNa}>N/A</div>
                </div>
                {criteriaOrdered.map(criterion => {
                  const isExcluded = excluded[criterion.id] ?? false;
                  const score = scores[criterion.id] ?? 4;
                  const normalizedWeight =
                    !isExcluded && sumWeights > 0 ? (Number(criterion.weight) / sumWeights) * 100 : 0;
                  const weightedContribution = isExcluded
                    ? 0
                    : lineWeightedScore({
                        id: '',
                        criterion_id: criterion.id,
                        criterion_code: criterion.code ?? '',
                        criterion_name: criterion.name,
                        score,
                        criterion_weight: sumWeights > 0 ? Number(criterion.weight) / sumWeights : 0,
                        sort_order: criterion.sort_order,
                      });
                  return (
                    <EvaluationMatrixCriterionRow
                      key={criterion.id}
                      criterionId={criterion.id}
                      criterionCode={criterion.code}
                      criterionName={criterion.name}
                      weightLabel={
                        isExcluded ? 'Не оцениваем' : `Вес ${weightPercent(normalizedWeight / 100)}`
                      }
                      score={score}
                      weightedDisplay={formatEvaluationScoreDisplay(weightedContribution)}
                      scoreSteps={SCORE_STEPS}
                      guideCode={GENERAL_SCORE_GUIDE_CODE}
                      disabled={isExcluded}
                      expanded={expandedCriterionIds.includes(criterion.id)}
                      onToggleExpand={() =>
                        setExpandedCriterionIds(prev =>
                          prev.includes(criterion.id)
                            ? prev.filter(id => id !== criterion.id)
                            : [...prev, criterion.id],
                        )
                      }
                      onScoreChange={step =>
                        setScores(prev => ({ ...prev, [criterion.id]: step }))
                      }
                      trailing={
                        <Checkbox
                          checked={isExcluded}
                          onChange={e =>
                            setExcluded(prev => ({ ...prev, [criterion.id]: e.target.checked }))
                          }
                        >
                          N/A
                        </Checkbox>
                      }
                    />
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
              {includedCriteria.length ? formatEvaluationScoreDisplay(weighted) : '-'}
            </Text>
          </Space>
        </div>

        <Form.Item
          name='comment'
          label='Комментарий'
          className={styles.commentField}
          rules={getEvaluationCommentRules(requiresComment)}
          required={requiresComment}
        >
          <Input.TextArea
            rows={2}
            placeholder={
              requiresComment
                ? 'Укажите причину низкой оценки и принятые меры…'
                : 'Дополнительные замечания…'
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

