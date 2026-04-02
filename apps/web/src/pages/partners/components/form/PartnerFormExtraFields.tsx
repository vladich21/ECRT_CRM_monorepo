import { ExperimentOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Row, Select, Space, Tag, Typography, theme } from 'antd';
import { useRef, useState } from 'react';

import { useCreatePartnerCompetence } from '../../../../api/partners/partnerCompetenceApiHooks';
import { PartnerCompetence } from '../../../../types/partner';

import type { PartnerFormRefs } from './partnerForm.types';

import styles from '../../PartnerFormPage.module.scss';

const { TextArea } = Input;
const { Text } = Typography;

type Props = {
  refs: PartnerFormRefs;
};

export function PartnerFormExtraFields({ refs }: Props) {
  const form = Form.useFormInstance();
  const { token } = theme.useToken();
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { mutate: createCompetence, isPending } = useCreatePartnerCompetence();

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCompetence(
      { name: trimmed },
      {
        onSuccess: (created) => {
          const current: string[] = form.getFieldValue('competence_ids') ?? [];
          form.setFieldValue('competence_ids', [...current, created.id]);
          setNewName('');
          setIsAdding(false);
        },
      },
    );
  };

  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <ExperimentOutlined /> Дополнительно
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label='Компетенции' name='competence_ids'>
            <Select
              mode='multiple'
              showSearch
              optionFilterProp='label'
              filterOption={(searchText, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(searchText.trim().toLowerCase())
              }
              placeholder='Начните вводить название компетенции'
              suffixIcon={<ExperimentOutlined />}
              optionLabelProp='label'
              tagRender={({ label, onClose }) => (
                <Tag onClose={onClose} closable bordered={false} className={styles.competenceTag}>
                  {label}
                </Tag>
              )}
              popupRender={menu => (
                <>
                  {menu}
                  <Divider style={{ margin: '6px 0' }} />
                  {isAdding ? (
                    <div style={{ padding: '4px 8px 8px' }}>
                      <Text type='secondary' style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                        Название новой компетенции
                      </Text>
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          ref={inputRef}
                          size='small'
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                            if (e.key === 'Escape') { setIsAdding(false); setNewName(''); }
                          }}
                          placeholder='Введите название'
                          autoFocus
                          maxLength={100}
                        />
                        <Button
                          size='small'
                          type='primary'
                          loading={isPending}
                          disabled={!newName.trim()}
                          onClick={handleCreate}
                        >
                          Создать
                        </Button>
                        <Button
                          size='small'
                          onClick={() => { setIsAdding(false); setNewName(''); }}
                        >
                          Отмена
                        </Button>
                      </Space.Compact>
                    </div>
                  ) : (
                    <div style={{ padding: '4px 8px 8px' }}>
                      <Button
                        type='link'
                        icon={<PlusOutlined />}
                        style={{ color: token.colorPrimary, padding: 0 }}
                        onClick={() => {
                          setIsAdding(true);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                      >
                        Добавить компетенцию
                      </Button>
                    </div>
                  )}
                </>
              )}
            >
              {refs.competencies?.map((competence: PartnerCompetence) => (
                <Select.Option key={competence.id} value={competence.id} label={competence.name}>
                  <div className={styles.competenceOptionContainer}>
                    <span className={styles.competenceOptionLabel}>{competence.name}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Комментарий' name='comment'>
            <TextArea placeholder='Введите комментарий' rows={3} />
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
