import { useState } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { App, Button, Form, Select, Space, Spin, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useQueryClient } from '@tanstack/react-query';

import { useApprovalStartInfo, useStartProcess } from '@/api/approvals/approvalApiHooks';
import { fileApi } from '@/api/files/fileApi';
import { fileQueryKeys } from '@/api/files/fileQueryKeys';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import { useModalStore, type ModalState } from '@/store/ModalStore';
import type { ApprovalRouteRef } from '@/types/approval';

import { BaseModal } from '../BaseModal';

function extractError(e: unknown): string | undefined {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

export const ApprovalStartModal: React.FC<ModalState> = ({ open, title, modalData }) => {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const closeModal = useModalStore((s) => s.closeModal);
  const [routeId, setRouteId] = useState<string | undefined>();
  const [stepAssignees, setStepAssignees] = useState<Record<number, string[]>>({});
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({});
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const { data: startInfo, isLoading } = useApprovalStartInfo(routeId);
  const start = useStartProcess();

  const entityType: string = modalData?.entityType;
  const entityId: string = modalData?.entityId;
  const routes: ApprovalRouteRef[] = modalData?.availableRoutes ?? [];

  const handleClose = () => {
    setRouteId(undefined);
    setStepAssignees({});
    setTaskAssignees({});
    setFileList([]);
    closeModal();
  };

  const uploadAttachedFiles = async () => {
    const files = fileList.map((f) => f.originFileObj as File).filter(Boolean);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((file, i) => fd.append(`file${i + 1}`, file));
    fd.append('entityType', entityType);
    fd.append('entityId', entityId);
    fd.append('documentSection', 'approval');
    await fileApi.uploadFiles(fd);
    await qc.invalidateQueries({ queryKey: fileQueryKeys.byEntity(entityType, entityId) });
  };

  const requiredFilled =
    !startInfo?.requires_selection ||
    (startInfo.steps_requiring_selection.every((s) => (stepAssignees[s.step_order]?.length ?? 0) > 0) &&
      startInfo.actions_requiring_selection.every((a) => !!taskAssignees[a.id]));

  const handleSubmit = async () => {
    if (!routeId) return;
    try {
      await start.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        route_id: routeId,
        step_assignees: Object.entries(stepAssignees).map(([so, ids]) => ({
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
        message.warning('Согласование запущено, но часть файлов не загрузилась — приложите их в панели');
      }
      message.success('Отправлено на согласование');
      handleClose();
    } catch (e) {
      message.error(extractError(e) ?? 'Не удалось запустить согласование');
    }
  };

  return (
    <BaseModal open={open} title={title} onCancel={handleClose} footer={null} width={560}>
      <Form layout="vertical">
        <Form.Item label="Маршрут согласования" required>
          <Select
            value={routeId}
            onChange={(v) => {
              setRouteId(v);
              setStepAssignees({});
              setTaskAssignees({});
            }}
            placeholder="Выберите маршрут"
            options={routes.map((r) => ({
              value: r.id,
              label: r.isDefault ? `${r.name} (по умолчанию)` : r.name,
            }))}
          />
        </Form.Item>

        {routeId && isLoading ? <Spin /> : null}

        {routeId && startInfo?.requires_selection ? (
          <>
            {startInfo.steps_requiring_selection.map((s) => (
              <Form.Item key={s.step_order} label={`Согласующие: ${s.name}`} required>
                <EmployeeSelect
                  multiple
                  ordered
                  value={stepAssignees[s.step_order]}
                  onChange={(v) => setStepAssignees((p) => ({ ...p, [s.step_order]: v as string[] }))}
                  placeholder="Выберите согласующих"
                />
              </Form.Item>
            ))}
            {startInfo.actions_requiring_selection.map((a) => (
              <Form.Item key={a.id} label={`Исполнитель задачи: ${a.title_template}`} required>
                <EmployeeSelect
                  value={taskAssignees[a.id]}
                  onChange={(v) => setTaskAssignees((p) => ({ ...p, [a.id]: v as string }))}
                />
              </Form.Item>
            ))}
          </>
        ) : null}

        <Form.Item label="Документы на согласование">
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
          <Button type="primary" disabled={!routeId || !requiredFilled} loading={start.isPending} onClick={handleSubmit}>
            Отправить
          </Button>
        </Space>
      </Form>
    </BaseModal>
  );
};
