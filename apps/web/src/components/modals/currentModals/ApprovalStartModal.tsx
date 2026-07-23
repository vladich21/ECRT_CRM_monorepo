import { useEffect, useMemo, useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Checkbox, Form, Select, Space, Spin, Typography, Upload, type UploadFile } from 'antd';

import { useApprovalStartInfo, useStartProcess } from '@/api/approvals/approvalApiHooks';
import { fileApi } from '@/api/files/fileApi';
import { fileQueryKeys } from '@/api/files/fileQueryKeys';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import { useModalStore, type ModalShellProps } from '@/store/ModalStore';
import type { ApprovalRouteRef } from '@/types/approval';

import { BaseModal } from '../BaseModal';

function extractError(e: unknown): string | undefined {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

type ApprovalStartModalData = {
  entityType: string;
  entityId: string;
  availableRoutes?: ApprovalRouteRef[];
};

function isStepIncluded(
  stepOrder: number,
  optionalIncluded: Record<number, boolean>,
  optionalStepOrders: Set<number>,
): boolean {
  if (!optionalStepOrders.has(stepOrder)) return true;
  return optionalIncluded[stepOrder] !== false;
}

export const ApprovalStartModal: React.FC<ModalShellProps> = ({ open, title, modalData: rawModalData }) => {
  const modalData = (rawModalData ?? {}) as ApprovalStartModalData;
  const { message } = App.useApp();
  const qc = useQueryClient();
  const closeModal = useModalStore(s => s.closeModal);
  const [routeId, setRouteId] = useState<string | undefined>();
  const [stepAssignees, setStepAssignees] = useState<Record<number, string[]>>({});
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({});
  const [optionalIncluded, setOptionalIncluded] = useState<Record<number, boolean>>({});
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const { data: startInfo, isLoading } = useApprovalStartInfo(routeId);
  const start = useStartProcess();

  const entityType: string = modalData?.entityType;
  const entityId: string = modalData?.entityId;
  const routes: ApprovalRouteRef[] = modalData?.availableRoutes ?? [];

  const optionalStepOrders = useMemo(
    () => new Set((startInfo?.optional_steps ?? []).map(s => s.step_order)),
    [startInfo?.optional_steps],
  );

  useEffect(() => {
    if (!startInfo?.optional_steps?.length) {
      setOptionalIncluded({});
      return;
    }
    setOptionalIncluded(
      Object.fromEntries(startInfo.optional_steps.map(s => [s.step_order, true])),
    );
  }, [startInfo?.optional_steps, routeId]);

  const includedStepOrders = useMemo(() => {
    if (!startInfo?.route_steps?.length || !startInfo.requires_step_selection) return undefined;
    return startInfo.route_steps
      .filter(s => isStepIncluded(s.step_order, optionalIncluded, optionalStepOrders))
      .map(s => s.step_order);
  }, [startInfo, optionalIncluded, optionalStepOrders]);

  const visibleAssigneeSteps = useMemo(
    () =>
      (startInfo?.steps_requiring_selection ?? []).filter(s =>
        isStepIncluded(s.step_order, optionalIncluded, optionalStepOrders),
      ),
    [startInfo?.steps_requiring_selection, optionalIncluded, optionalStepOrders],
  );

  const handleClose = () => {
    setRouteId(undefined);
    setStepAssignees({});
    setTaskAssignees({});
    setOptionalIncluded({});
    setFileList([]);
    closeModal();
  };

  const uploadAttachedFiles = async () => {
    const files = fileList.map(f => f.originFileObj as File).filter(Boolean);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((file, i) => fd.append(`file${i + 1}`, file));
    fd.append('entityType', entityType);
    fd.append('entityId', entityId);
    fd.append('documentSection', 'approval');
    await fileApi.uploadFiles(fd);
    await qc.invalidateQueries({ queryKey: fileQueryKeys.byEntity(entityType, entityId) });
  };

  const assigneesFilled =
    visibleAssigneeSteps.every(s => (stepAssignees[s.step_order]?.length ?? 0) > 0) &&
    (startInfo?.actions_requiring_selection ?? []).every(a => !!taskAssignees[a.id]);

  const hasIncludedSteps = !startInfo?.requires_step_selection || (includedStepOrders?.length ?? 0) > 0;

  const requiredFilled = assigneesFilled && hasIncludedSteps;

  const handleSubmit = async () => {
    if (!routeId) return;
    try {
      await start.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        route_id: routeId,
        included_step_orders: includedStepOrders,
        step_assignees: Object.entries(stepAssignees)
          .filter(([so]) => isStepIncluded(Number(so), optionalIncluded, optionalStepOrders))
          .map(([so, ids]) => ({
            step_order: Number(so),
            employee_ids: ids,
          })),
        task_assignees: Object.entries(taskAssignees).map(([action_id, employee_id]) => ({
          action_id,
          employee_id,
        })),
      });
      try {
        await uploadAttachedFiles();
      } catch {
        message.warning('Согласование запущено, но часть файлов не загрузилась - приложите их в панели');
      }
      message.success('Отправлено на согласование');
      handleClose();
    } catch (e) {
      message.error(extractError(e) ?? 'Не удалось запустить согласование');
    }
  };

  return (
    <BaseModal open={open} title={title} onCancel={handleClose} footer={null} width={560}>
      <Form layout='vertical'>
        <Form.Item label='Маршрут согласования' required>
          <Select
            value={routeId}
            onChange={v => {
              setRouteId(v);
              setStepAssignees({});
              setTaskAssignees({});
              setOptionalIncluded({});
            }}
            placeholder='Выберите маршрут'
            options={routes.map(r => ({
              value: r.id,
              label: r.isDefault ? `${r.name} (по умолчанию)` : r.name,
            }))}
          />
        </Form.Item>

        {routeId && isLoading ? <Spin /> : null}

        {routeId && startInfo?.requires_step_selection ? (
          <Form.Item label='Шаги согласования'>
            <Space direction='vertical' style={{ width: '100%' }}>
              {(startInfo.route_steps ?? []).map(step => {
                const isOptional = optionalStepOrders.has(step.step_order);
                if (!isOptional) {
                  return (
                    <Typography.Text key={step.step_order} type='secondary'>
                      {step.step_order}. {step.name} - обязательный
                    </Typography.Text>
                  );
                }
                return (
                  <Checkbox
                    key={step.step_order}
                    checked={optionalIncluded[step.step_order] !== false}
                    onChange={e =>
                      setOptionalIncluded(prev => ({ ...prev, [step.step_order]: e.target.checked }))
                    }
                  >
                    {step.step_order}. {step.name}
                  </Checkbox>
                );
              })}
            </Space>
          </Form.Item>
        ) : null}

        {routeId && visibleAssigneeSteps.length > 0 ? (
          <>
            {visibleAssigneeSteps.map(s => (
              <Form.Item key={s.step_order} label={`Согласующие: ${s.name}`} required>
                <EmployeeSelect
                  multiple
                  ordered
                  value={stepAssignees[s.step_order]}
                  onChange={v => setStepAssignees(p => ({ ...p, [s.step_order]: v as string[] }))}
                  placeholder='Выберите согласующих'
                />
              </Form.Item>
            ))}
          </>
        ) : null}

        {routeId && (startInfo?.actions_requiring_selection?.length ?? 0) > 0 ? (
          <>
            {startInfo!.actions_requiring_selection.map(a => (
              <Form.Item key={a.id} label={`Исполнитель задачи: ${a.title_template}`} required>
                <EmployeeSelect
                  value={taskAssignees[a.id]}
                  onChange={v => setTaskAssignees(p => ({ ...p, [a.id]: v as string }))}
                />
              </Form.Item>
            ))}
          </>
        ) : null}

        <Form.Item label='Документы на согласование'>
          <Upload
            multiple
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
          >
            <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
          </Upload>
        </Form.Item>

        <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={handleClose}>Отмена</Button>
          <Button
            type='primary'
            disabled={!routeId || !requiredFilled}
            loading={start.isPending}
            onClick={handleSubmit}
          >
            Отправить
          </Button>
        </Space>
      </Form>
    </BaseModal>
  );
};
