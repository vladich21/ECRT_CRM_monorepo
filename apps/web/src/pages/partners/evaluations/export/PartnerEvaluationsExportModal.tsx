import { useEffect, useMemo, useState } from 'react';
import { App, Checkbox, DatePicker, Form, Modal, Select, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { useReferenceData } from '../../../../api/hooks/useReferences';
import { supplierEvaluationApi } from '../../../../api/supplierEvaluations/supplierEvaluationApi';
import { usePartnerEvaluationReport } from '../../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { Partner } from '../../../../types/partner';
import type { SupplierEvaluationBlock } from '../../../../types/supplierEvaluation';

import {
  buildPartnerEvaluationsExportFilePrefix,
  buildPartnerEvaluationsExportSheets,
} from './partnerEvaluationsExportMapper';
import { exportPartnerEvaluationsToExcel } from './exportPartnerEvaluationsToExcel';

type PartnerEvaluationsExportModalProps = {
  open: boolean;
  onClose: () => void;
  partner: Partner;
};

type FormValues = {
  projectIds: string[];
  period?: [Dayjs, Dayjs];
  includeArchived: boolean;
  includeInitial: boolean;
};

export default function PartnerEvaluationsExportModal({
  open,
  onClose,
  partner,
}: PartnerEvaluationsExportModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading: reportLoading, isError: reportError } = usePartnerEvaluationReport(
    partner.id,
    open,
  );
  const { data: references } = useReferenceData(['partnerStatuses']);

  const partnerStatusName = useMemo(() => {
    const status = references?.partnerStatuses?.find(
      item => String(item.id) === String(partner.status_id),
    );
    return (status?.name ?? '').trim() || '-';
  }, [partner.status_id, references?.partnerStatuses]);

  const partnerName = useMemo(
    () => (partner.short_name || partner.name || partner.inn || 'Контрагент').trim(),
    [partner.inn, partner.name, partner.short_name],
  );

  const projectOptions = useMemo(
    () =>
      (report?.projects ?? []).map(project => ({
        value: project.id,
        label: project.label,
      })),
    [report?.projects],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      projectIds: (report?.projects ?? []).map(project => project.id),
      period: undefined,
      includeArchived: true,
      includeInitial: true,
    });
  }, [open, report?.projects, form]);

  const handleOk = async () => {
    if (!report) {
      message.error('Не удалось загрузить данные отчета');
      return;
    }

    try {
      const values = await form.validateFields();
      setExporting(true);

      const selectedProjectIds = values.projectIds ?? [];
      const allProjectIds = (report.projects ?? []).map(project => project.id);
      const effectiveProjectIds =
        selectedProjectIds.length === 0 || selectedProjectIds.length === allProjectIds.length
          ? undefined
          : selectedProjectIds;

      const projectsForBlocks = effectiveProjectIds ?? allProjectIds;
      const blockResults = await Promise.all(
        projectsForBlocks.map(projectId =>
          supplierEvaluationApi.getActiveBlock(partner.id, projectId),
        ),
      );
      const blocks: SupplierEvaluationBlock[] = blockResults.filter(
        (block): block is SupplierEvaluationBlock => block != null,
      );

      let initialPayload: {
        record: NonNullable<Awaited<ReturnType<typeof supplierEvaluationApi.getActiveInitial>>>;
        detail: Awaited<ReturnType<typeof supplierEvaluationApi.getById>>;
      } | null = null;

      if (values.includeInitial) {
        const initial = await supplierEvaluationApi.getActiveInitial(partner.id);
        if (initial) {
          const detail = await supplierEvaluationApi.getById(initial.id);
          initialPayload = { record: initial, detail };
        }
      }

      const dateFrom = values.period?.[0] ? values.period[0].format('YYYY-MM-DD') : null;
      const dateTo = values.period?.[1] ? values.period[1].format('YYYY-MM-DD') : null;

      const sheets = buildPartnerEvaluationsExportSheets(
        {
          partnerName,
          partnerStatusName,
          report,
          blocks,
          initial: initialPayload,
        },
        {
          projectIds: effectiveProjectIds,
          dateFrom,
          dateTo,
          includeArchived: values.includeArchived,
          includeInitial: values.includeInitial,
        },
      );

      const evaluationsSheet = sheets.find(sheet => sheet.sheetName === 'Оценки');
      if (!evaluationsSheet || evaluationsSheet.rows.length === 0) {
        message.info('Нет оценок по выбранным фильтрам');
        return;
      }

      await exportPartnerEvaluationsToExcel(
        sheets,
        buildPartnerEvaluationsExportFilePrefix(partnerName, partner.inn),
      );
      message.success('Файл Excel сформирован');
      onClose();
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error('Не удалось выгрузить оценки в Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      title='Выгрузка оценок в Excel'
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText='Выгрузить'
      cancelText='Отмена'
      confirmLoading={exporting}
      destroyOnHidden
      width={560}
    >
      <Spin spinning={reportLoading}>
        {reportError ? (
          <div style={{ color: '#cf1322', marginBottom: 12 }}>
            Не удалось загрузить данные для выгрузки
          </div>
        ) : null}
        <Form
          form={form}
          layout='vertical'
          initialValues={{
            projectIds: [],
            period: undefined,
            includeArchived: true,
            includeInitial: true,
          }}
        >
          <Form.Item
            name='projectIds'
            label='Проекты'
            extra='Пустой выбор или все проекты — выгрузка по всем'
          >
            <Select
              mode='multiple'
              allowClear
              optionFilterProp='label'
              placeholder='Все проекты'
              options={projectOptions}
              maxTagCount='responsive'
            />
          </Form.Item>

          <Form.Item name='period' label='Период оценки' extra='Не задан — без ограничения по дате'>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              format='DD.MM.YYYY'
              allowEmpty={[true, true]}
              disabledDate={current => current != null && current.isAfter(dayjs(), 'day')}
            />
          </Form.Item>

          <Form.Item name='includeArchived' valuePropName='checked'>
            <Checkbox>Включить архивные оценки (переоценки)</Checkbox>
          </Form.Item>

          <Form.Item name='includeInitial' valuePropName='checked'>
            <Checkbox>Включить первичную оценку</Checkbox>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
}
