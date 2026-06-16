import { useEffect, useState } from 'react';
import { App, Button, Card, Divider, Form, Input, Select, Space, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import {
  useApprovalEntityTypes,
  useApprovalRouteDetail,
  useApprovalStepRoles,
  useCreateRoute,
  useReplaceRouteSteps,
  useUpdateRoute,
} from '@/api/approvals/approvalApiHooks';
import { RouteActionsEditor } from '@/components/approvals/RouteActionsEditor';
import { RouteStepsEditor } from '@/components/approvals/RouteStepsEditor';
import type {
  ApprovalEntityTypeRef,
  ApprovalStepRoleRef,
  PostApprovalActionForm,
  RouteStepFormValue,
} from '@/types/approval';

function extractError(e: unknown): string | undefined {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

interface MetaForm {
  code: string;
  name: string;
  description?: string;
  entity_type_id: string;
  is_default?: boolean;
  is_active?: boolean;
}

export default function ApprovalRouteFormPage() {
  const { routeId } = useParams();
  const isEdit = !!routeId;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<MetaForm>();

  const entityTypes = useApprovalEntityTypes();
  const stepRoles = useApprovalStepRoles();
  const detail = useApprovalRouteDetail(routeId);
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();
  const replaceSteps = useReplaceRouteSteps();

  const [steps, setSteps] = useState<RouteStepFormValue[]>([]);
  const [actions, setActions] = useState<PostApprovalActionForm[]>([]);

  useEffect(() => {
    if (isEdit && detail.data) {
      const r = detail.data as Record<string, any>;
      form.setFieldsValue({
        code: r.code,
        name: r.name,
        description: r.description ?? undefined,
        entity_type_id: r.entityTypeId,
        is_default: r.isDefault,
        is_active: r.isActive,
      });
      setSteps(
        (r.steps ?? []).map((s: Record<string, any>) => ({
          key: s.id,
          name: s.name,
          description: s.description ?? undefined,
          step_type: s.stepType,
          assignment_type: s.assignmentType,
          step_role_id: s.stepRoleId ?? undefined,
          assignee_ids: s.assignee_ids ?? [],
          is_required: s.isRequired ?? true,
          can_delegate: s.canDelegate ?? false,
          can_return_to_previous: s.canReturnToPrevious ?? true,
          time_limit_hours: s.timeLimitHours ?? null,
        })),
      );
      setActions((r.onCompleteActions ?? []) as PostApprovalActionForm[]);
    }
  }, [isEdit, detail.data, form]);

  const validateSteps = (): string | null => {
    if (steps.length === 0) return 'Добавьте хотя бы один шаг';
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (!s.name.trim()) return `Шаг ${i + 1}: укажите название`;
      if (s.assignment_type === 'employee' && !s.assignee_ids?.length) {
        return `Шаг ${i + 1}: выберите согласующих`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    let meta: MetaForm;
    try {
      meta = await form.validateFields();
    } catch {
      return;
    }
    const stepErr = validateSteps();
    if (stepErr) {
      message.error(stepErr);
      return;
    }

    const metaPayload = {
      code: meta.code,
      name: meta.name,
      description: meta.description ?? null,
      entity_type_id: meta.entity_type_id,
      is_default: meta.is_default ?? false,
      is_active: meta.is_active ?? true,
      on_complete_actions: actions,
    };
    const stepsPayload = steps.map((s, i) => ({
      step_order: i + 1,
      name: s.name,
      description: s.description ?? null,
      step_type: s.step_type,
      assignment_type: s.assignment_type,
      step_role_id: s.step_role_id ?? null,
      assignee_ids: s.assignment_type === 'employee' ? s.assignee_ids ?? [] : [],
      is_required: s.is_required ?? true,
      can_delegate: s.can_delegate ?? false,
      can_return_to_previous: s.can_return_to_previous ?? true,
      time_limit_hours: s.time_limit_hours ?? null,
    }));

    try {
      const id = isEdit
        ? (await updateRoute.mutateAsync({ routeId: routeId!, data: metaPayload }), routeId!)
        : (await createRoute.mutateAsync(metaPayload)).id;
      await replaceSteps.mutateAsync({ routeId: id, steps: stepsPayload });
      message.success(isEdit ? 'Маршрут обновлён' : 'Маршрут создан');
      navigate('/admin/approval-routes');
    } catch (e) {
      message.error(extractError(e) ?? 'Не удалось сохранить маршрут');
    }
  };

  const saving = createRoute.isPending || updateRoute.isPending || replaceSteps.isPending;

  return (
    <Card
      title={isEdit ? 'Редактирование маршрута' : 'Новый маршрут согласования'}
      extra={
        <Space>
          <Button onClick={() => navigate('/admin/approval-routes')}>Отмена</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            Сохранить
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ is_active: true, is_default: false }}>
        <Space size="large" style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]} style={{ minWidth: 320 }}>
            <Input placeholder="Например, Согласование договора" />
          </Form.Item>
          <Form.Item name="code" label="Код" rules={[{ required: true, min: 2, message: 'Минимум 2 символа' }]} style={{ minWidth: 240 }}>
            <Input placeholder="contract_default" disabled={isEdit} />
          </Form.Item>
          <Form.Item
            name="entity_type_id"
            label="Тип сущности"
            rules={[{ required: true, message: 'Выберите тип' }]}
            style={{ minWidth: 240 }}
          >
            <Select
              placeholder="Тип сущности"
              options={(entityTypes.data ?? []).map((t: ApprovalEntityTypeRef) => ({ value: t.id, label: t.name }))}
            />
          </Form.Item>
        </Space>

        <Form.Item name="description" label="Описание">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Space size="large">
          <Form.Item name="is_active" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="is_default" label="По умолчанию для типа" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
      </Form>

      <Divider orientation="left">Шаги маршрута</Divider>
      <RouteStepsEditor value={steps} onChange={setSteps} stepRoles={(stepRoles.data ?? []) as ApprovalStepRoleRef[]} />

      <Divider orientation="left">Действия после согласования</Divider>
      <RouteActionsEditor value={actions} onChange={setActions} />
    </Card>
  );
}
