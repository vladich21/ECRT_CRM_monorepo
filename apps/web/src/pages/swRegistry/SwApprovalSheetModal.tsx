import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal } from 'antd';

import type { SwDocumentFileRef, SwDocumentListRow } from '@/types/swRegistry';

import { assembleSheetDesignation } from './shared/swDesignationPreview';
import { SwFileSourcePicker, type SwFileChoice } from './shared/SwFileSourcePicker';
import styles from './SwApprovalSheetModal.module.scss';

type FormValues = {
  designation?: string;
  sheetsCount?: number;
};

export type ApprovalSheetSubmit = {
  designation: string;
  sheetsCount: number;
  /** Файл из SVN, выбранный здесь же: прикрепляется после сохранения листа. */
  svnPath?: string;
  /** Либо файл с компьютера — грузится тем же порядком, после сохранения листа. */
  localFile?: File;
};

interface Props {
  open: boolean;
  document: SwDocumentListRow | null;
  /** Уже прикреплённая копия листа, если она есть. */
  sheetFile?: SwDocumentFileRef | null;
  svnEnabled?: boolean;
  /** Каталог программы в SVN: проводник открывается сразу в нём. */
  svnFolderPath?: string | null;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (payload: ApprovalSheetSubmit) => void;
}

/**
 * Лист утверждения: обозначение, объём и сам файл. Лист — такой же документ,
 * поэтому копию выбирают здесь, а не отдельным действием после оформления.
 * Наименование листа не хранится и выводится из наименования документа (ДОК-11).
 */
export function SwApprovalSheetModal({
  open,
  document,
  sheetFile,
  svnEnabled,
  svnFolderPath,
  confirmLoading,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const [fileChoice, setFileChoice] = useState<SwFileChoice | null>(null);

  useEffect(() => {
    if (!open || !document) return;
    form.setFieldsValue({
      designation: document.sheetDesignation ?? assembleSheetDesignation(document.designation),
      sheetsCount: document.sheetSheetsCount ?? 1,
    });
    setFileChoice(null);
  }, [open, document, form]);

  const submit = async () => {
    const values = await form.validateFields();
    onSubmit({
      designation: (values.designation ?? '').trim(),
      sheetsCount: values.sheetsCount ?? 1,
      ...(fileChoice?.svnPath ? { svnPath: fileChoice.svnPath } : {}),
      ...(fileChoice?.localFile ? { localFile: fileChoice.localFile } : {}),
    });
  };

  const isEditing = Boolean(document?.sheetStatusCode);

  return (
    <Modal
      open={open}
      title={isEditing ? 'Лист утверждения' : 'Оформить лист утверждения'}
      okText={isEditing ? 'Сохранить' : 'Оформить'}
      cancelText='Отмена'
      confirmLoading={confirmLoading}
      onCancel={onCancel}
      onOk={() => void submit()}
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout='vertical' className={styles.formCompact}>
        <Form.Item
          name='designation'
          label='Обозначение листа утверждения'
          rules={[{ required: true, message: 'Укажите обозначение' }]}
          extra={`Документ: ${document?.designation ?? ''}`}
        >
          <Input placeholder='РОФ.ГКМН.620013-01 12 01-ЛУ' maxLength={100} />
        </Form.Item>

        <Form.Item
          name='sheetsCount'
          label='Количество листов'
          rules={[{ required: true, message: 'Укажите количество листов' }]}
        >
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>

        <SwFileSourcePicker
          title='Файл листа утверждения'
          current={sheetFile ?? null}
          svnEnabled={svnEnabled}
          svnFolderPath={svnFolderPath}
          dropText='Перетащите файл листа или нажмите для выбора'
          value={fileChoice}
          onChange={setFileChoice}
        />
      </Form>
    </Modal>
  );
}
