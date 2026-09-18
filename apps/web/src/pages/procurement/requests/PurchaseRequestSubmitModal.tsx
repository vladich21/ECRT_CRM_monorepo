import { useState } from 'react';
import { Button, Checkbox, Modal, Typography } from 'antd';

const { Text } = Typography;

type Props = {
  open: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onConfirm: (includeInitiatorHead: boolean) => void;
};

/** ВИ-4: шаг «Руководитель инициатора» необязательный, РП и начальник ОУП — обязательные, без выбора. */
export function PurchaseRequestSubmitModal({ open, confirmLoading, onCancel, onConfirm }: Props) {
  const [includeInitiatorHead, setIncludeInitiatorHead] = useState(true);

  return (
    <Modal
      title='Отправить на утверждение'
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      afterOpenChange={visible => {
        if (visible) setIncludeInitiatorHead(true);
      }}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Отмена
        </Button>,
        <Button key='ok' type='primary' loading={confirmLoading} onClick={() => onConfirm(includeInitiatorHead)}>
          Отправить
        </Button>,
      ]}
    >
      <Checkbox checked={includeInitiatorHead} onChange={e => setIncludeInitiatorHead(e.target.checked)}>
        Согласование руководителя инициатора
      </Checkbox>
      <p>
        <Text type='secondary'>
          Обязательные шаги — руководитель проекта и начальник ОУП — включены всегда и в модальном окне не отключаются.
        </Text>
      </p>
    </Modal>
  );
}
