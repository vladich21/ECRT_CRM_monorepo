import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Form, Input, Modal, Select } from 'antd';

import { patentApi } from '@/api/patents/patentApi';
import { buildPatentSelectLabel } from '@/pages/referenceBooks/patentGrants/utils/patentGrantCardHelpers';
import type { AddSwItemPatentLinkPayload } from '@/types/swRegistry';

type SwItemPatentLinkModalProps = {
  open: boolean;
  confirmLoading?: boolean;
  excludedPatentIds: string[];
  onCancel: () => void;
  onSubmit: (payload: AddSwItemPatentLinkPayload) => void;
};

export function SwItemPatentLinkModal({
  open,
  confirmLoading,
  excludedPatentIds,
  onCancel,
  onSubmit,
}: SwItemPatentLinkModalProps) {
  const [form] = Form.useForm<AddSwItemPatentLinkPayload>();
  const [search, setSearch] = useState('');

  const patentsQuery = useQuery({
    queryKey: ['sw', 'patent-picker', search],
    queryFn: async () => {
      const res = await patentApi.getPatents({ search, deletedScope: 'active', limit: 50, preview: true });
      return Array.isArray(res) ? res : res.data;
    },
    enabled: open,
  });

  const options = useMemo(() => {
    const excluded = new Set(excludedPatentIds);
    return (patentsQuery.data ?? [])
      .filter(p => !excluded.has(p.id))
      .map(p => ({
        value: p.id,
        label: buildPatentSelectLabel({
          registration_number: p.registration_number,
          name: p.name,
        }),
      }));
  }, [patentsQuery.data, excludedPatentIds]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      patentId: values.patentId,
      comment: values.comment?.trim() || null,
    });
  };

  return (
    <Modal
      title='Привязать карточку РИД'
      open={open}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      confirmLoading={confirmLoading}
      destroyOnClose
      afterClose={() => {
        form.resetFields();
        setSearch('');
      }}
    >
      <Form form={form} layout='vertical' preserve={false}>
        <Form.Item name='patentId' label='Карточка РИД' rules={[{ required: true, message: 'Выберите карточку РИД' }]}>
          <Select
            showSearch
            filterOption={false}
            placeholder='Поиск по номеру или наименованию'
            options={options}
            loading={patentsQuery.isLoading}
            onSearch={setSearch}
            notFoundContent={patentsQuery.isLoading ? 'Загрузка…' : 'Ничего не найдено'}
          />
        </Form.Item>
        <Form.Item name='comment' label='Комментарий'>
          <Input.TextArea rows={2} maxLength={500} placeholder='Необязательно' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
