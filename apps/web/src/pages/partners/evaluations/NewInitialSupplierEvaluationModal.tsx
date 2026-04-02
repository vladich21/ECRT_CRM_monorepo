import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, DatePicker, Form, Input, Modal, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import {
  useCreateInitialSupplierEvaluation,
  useSupplierEvaluationCriteria,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import type { SupplierEvaluationCriterion } from '../../../types/supplierEvaluation';
import {
  CategoryTag,
  SCORE_STEPS,
  categoryFromWeightedScore,
  lineWeightedScore,
} from './supplierEvaluationUi';
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

  const criteriaOrdered = useMemo(
    () => [...criteria].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [criteria],
  );

  useEffect(() => {
    if (open && criteriaOrdered.length) {
      setScores(defaultScores(criteriaOrdered));
      setExcluded(Object.fromEntries(criteriaOrdered.map(c => [c.id, false])));
      form.setFieldsValue({ evaluated_at: dayjs(), comment: undefined });
    }
  }, [open, criteriaOrdered, form]);

  const includedCriteria = useMemo(
    () => criteriaOrdered.filter(c => !excluded[c.id]),
    [criteriaOrdered, excluded],
  );

  const sumWeights = useMemo(() => includedCriteria.reduce((acc, c) => acc + Number(c.weight), 0), [includedCriteria]);

  const weighted = useMemo(() => {
    if (!includedCriteria.length || !Number.isFinite(sumWeights) || sumWeights <= 0) return 0;
    const raw = includedCriteria.reduce((acc, c) => {
      const score = scores[c.id] ?? 4;
      return acc + score * (Number(c.weight) / sumWeights);
    }, 0);
    return Math.round(raw * 100) / 100;
  }, [includedCriteria, scores, sumWeights]);

  const previewCategory = categoryFromWeightedScore(weighted);

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
          scores: includedCriteria.map(c => ({ criterion_id: c.id, score: scores[c.id] ?? 4 })),
        },
        {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
          onError: (error: unknown) => {
            const msg =
              error && typeof error === 'object' && 'response' in error
                ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                : undefined;
            showNotification('error', 'Ошибка', msg ? String(msg) : 'Не удалось сохранить оценку');
          },
        },
      );
    });

  return (
    <Modal
      title='Первичная оценка контрагента'
      open={open}
      onCancel={onClose}
      width={720}
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
            <Text type='secondary' className={styles.matrixHeaderMeta}>
              {includedCriteria.length === 0 ? 'Сумма весов: —' : 'Сумма весов: 100%'}
            </Text>
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
                    <div key={criterion.id} className={styles.criterionRow}>
                      <div className={styles.colGrow}>
                        <div className={styles.criterionTitle}>{criterion.name}</div>
                        <Text type='secondary' className={styles.criterionMeta}>
                          {isExcluded ? 'Не оцениваем' : `Вес ${normalizedWeight.toFixed(1)}%`}
                        </Text>
                      </div>
                      <Space size={4} wrap>
                        {SCORE_STEPS.map(step => (
                          <Button
                            key={step}
                            size='small'
                            type={score === step ? 'primary' : 'default'}
                            disabled={isExcluded}
                            onClick={() => setScores(prev => ({ ...prev, [criterion.id]: step }))}
                          >
                            {step}
                          </Button>
                        ))}
                      </Space>
                      <Text strong className={styles.scoreAccent}>
                        {isExcluded ? '—' : score}
                      </Text>
                      <Text strong className={styles.weightedAccent}>
                        {isExcluded ? '—' : weightedContribution.toFixed(3)}
                      </Text>
                      <div className={styles.colNa}>
                        <Checkbox
                          checked={isExcluded}
                          onChange={e => setExcluded(prev => ({ ...prev, [criterion.id]: e.target.checked }))}
                        >
                          N/A
                        </Checkbox>
                      </div>
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
              {includedCriteria.length ? weighted.toFixed(2) : '—'}
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

