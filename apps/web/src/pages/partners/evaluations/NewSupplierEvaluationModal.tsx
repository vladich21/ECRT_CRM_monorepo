import { useEffect, useMemo, useState } from 'react';
import { Button, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { useProjectsPreview } from '../../../api/projects/projectApiHooks';
import {
  useCreateSupplierEvaluation,
  useSupplierEvaluationCriteria,
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

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  /** Предзаполнить проект (переоценка по строке) */
  initialProjectId?: string;
  onSuccess?: () => void;
};

function defaultScores(criteria: SupplierEvaluationCriterion[]): Record<string, number> {
  return Object.fromEntries(criteria.map(c => [c.id, 4]));
}

export default function NewSupplierEvaluationModal({
  open,
  onClose,
  partnerId,
  initialProjectId,
  onSuccess,
}: Props) {
  const [form] = Form.useForm<{ evaluated_at: Dayjs; project_id: string; comment?: string }>();
  const { data: criteria = [], isLoading: criteriaLoading } = useSupplierEvaluationCriteria();
  const { data: projects = [], isLoading: projectsLoading } = useProjectsPreview();
  const createMut = useCreateSupplierEvaluation();
  const { showNotification, contextHolder } = useNotification();
  const currentUser = useAuthStore(s => s.user);
  const [scores, setScores] = useState<Record<string, number>>({});

  const criteriaOrdered = useMemo(
    () => [...criteria].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
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
    () => computeWeightedPreview(criteriaOrdered.map(c => ({ id: c.id, weight: c.weight })), scores),
    [criteriaOrdered, scores],
  );
  const previewCategory = categoryFromWeightedScore(weighted);

  const projectOptions = useMemo(
    () =>
      projects.map(p => ({
        value: p.id,
        label: p.name || p.code || p.id,
      })),
    [projects],
  );

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const projectId = values.project_id;
      if (!criteriaOrdered.length) return;
      await createMut.mutateAsync({
        partner_id: partnerId,
        project_id: projectId,
        evaluated_at: values.evaluated_at.format('YYYY-MM-DD'),
        comment: values.comment?.trim() || undefined,
        scores: criteriaOrdered.map(c => ({
          criterion_id: c.id,
          score: scores[c.id] ?? 4,
        })),
      });
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      if (msg) showNotification('error', 'Ошибка', String(msg));
    }
  };

  return (
    <Modal
      title='Новая оценка'
      open={open}
      onCancel={onClose}
      width={720}
      styles={{ body: { paddingTop: 12 } }}
      destroyOnHidden
      okText='Сохранить оценку'
      confirmLoading={createMut.isPending}
      onOk={handleOk}
    >
      {contextHolder}
      <Form form={form} layout='vertical' style={{ marginTop: 0 }}>
        <Row gutter={[16, 8]}>
          <Col xs={24} sm={10} md={9}>
            <Form.Item
              name='evaluated_at'
              label='Дата оценки'
              rules={[{ required: true, message: 'Укажите дату' }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker format='DD.MM.YYYY' style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={14} md={15}>
            <Form.Item
              name='project_id'
              label='Проект'
              rules={[{ required: true, message: 'Выберите проект' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                showSearch
                allowClear
                placeholder='Выберите проект'
                options={projectOptions}
                loading={projectsLoading}
                optionFilterProp='label'
                style={{ width: '100%' }}
                popupMatchSelectWidth={false}
                dropdownStyle={{ minWidth: 320 }}
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginTop: 14 }}>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            Закупщик
          </Text>
          <Text strong style={{ color: '#262626' }}>
            {formatSrmUserName(currentUser)}
          </Text>
          <Text type='secondary' style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Оценка фиксируется за пользователем, который нажимает «Сохранить».
          </Text>
        </div>

        <div style={{ marginTop: 16, border: '1px solid #f0f0f0', borderRadius: 8, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Text type='secondary' style={{ fontSize: 12, fontWeight: 600 }}>
              Матрица оценки
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Сумма весов: 100%
            </Text>
          </div>
          <div style={{ padding: '8px 14px 12px' }}>
            {criteriaLoading ? (
              <Text type='secondary'>Загрузка критериев…</Text>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingBottom: 8,
                    marginBottom: 4,
                    borderBottom: '1px solid #f0f0f0',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#8c8c8c',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>Критерий</div>
                  <div style={{ flexShrink: 0 }}>Шкала</div>
                  <div style={{ width: 40, textAlign: 'right', flexShrink: 0 }}>Балл</div>
                  <div style={{ width: 56, textAlign: 'right', flexShrink: 0 }}>× Вес</div>
                </div>
                {criteriaOrdered.map(c => {
                const criterionScore = scores[c.id] ?? 4;
                const weightedLineContribution = lineWeightedScore({
                  id: '',
                  criterion_id: c.id,
                  criterion_code: c.code,
                  criterion_name: c.name,
                  score: criterionScore,
                  criterion_weight: c.weight,
                  sort_order: c.sort_order,
                });
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid #f5f5f5',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        Вес {(c.weight * 100).toFixed(1)}% · порядок {c.sort_order}
                      </Text>
                    </div>
                    <Space size={4} wrap>
                      {SCORE_STEPS.map(n => (
                        <Button
                          key={n}
                          size='small'
                          type={scores[c.id] === n ? 'primary' : 'default'}
                          onClick={() => setScores(s => ({ ...s, [c.id]: n }))}
                        >
                          {n}
                        </Button>
                      ))}
                    </Space>
                    <Text strong style={{ width: 40, textAlign: 'right', color: '#1677ff' }}>
                      {criterionScore}
                    </Text>
                    <Text strong style={{ width: 56, textAlign: 'right', color: '#1677ff', fontVariantNumeric: 'tabular-nums' }}>
                      {weightedLineContribution.toFixed(3)}
                    </Text>
                  </div>
                );
              })}
              </>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: '12px 16px',
            background: 'rgba(22, 119, 255, 0.06)',
            border: '1px solid #d6e4ff',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#1677ff' }}>Итоговый балл</Text>
          <Space align='center'>
            <CategoryTag category={previewCategory} />
            <Text strong style={{ fontSize: 22, color: '#0958d9' }}>
              {criteriaOrdered.length ? weighted.toFixed(2) : '—'}
            </Text>
          </Space>
        </div>

        <Form.Item name='comment' label='Комментарий' style={{ marginTop: 14 }}>
          <Input.TextArea rows={3} placeholder='Дополнительные замечания…' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
