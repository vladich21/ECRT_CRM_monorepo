import {
  FileTextOutlined,
  NumberOutlined,
  PlusOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Row, Select } from 'antd';

import type { ProjectPreviewItem } from '@/api/projects/projectApi';
import type { ContractFormMode, ContractFormRefs } from './contractForm.types';
import formFieldStyles from './ContractFormMainFields.module.scss';

const { TextArea } = Input;

type Props = {
  mode: ContractFormMode;
  refs: ContractFormRefs;
  onCreatePartner?: () => void;
  onProjectChange?: (project: ProjectPreviewItem | null) => void;
  requireFullValidation?: boolean;
};

export function ContractFormMainFields({ mode, refs, onCreatePartner, onProjectChange, requireFullValidation = false }: Props) {

  const handleProjectChange = (value: string | undefined) => {
    if (!onProjectChange) return;
    const project = refs.projects?.find(projectRow => projectRow.id === value) ?? null;
    onProjectChange(project);
  };

  return (
    <>
      <Divider orientation='left'>
        <FileTextOutlined /> Основные реквизиты
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={4}>
          <Form.Item
            label='Номер договора'
            name='number'
            rules={requireFullValidation ? [{ required: true, message: 'Введите номер договора' }] : undefined}
          >
            <Input placeholder='№123-Д' prefix={<NumberOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
          <Form.Item label='Шифр договора' name='cipher'>
            <Input placeholder='ДГ-2024-001' />
          </Form.Item>
        </Col>

        <Col xs={24} md={16}>
          <Form.Item
            label='Название'
            name='name'
            rules={[{ required: true, message: 'Введите название договора' }]}
          >
            <Input placeholder='Введите название договора' />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label='Описание' name='description'>
            <TextArea placeholder='Введите описание договора' rows={3} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label='Контрагент'
            name='partner_id'
            rules={requireFullValidation ? [{ required: true, message: 'Выберите контрагента' }] : undefined}
          >
            <Select
              className={formFieldStyles.partnerSelect}
              classNames={{ popup: { root: formFieldStyles.partnerSelectPopup } }}
              popupMatchSelectWidth={false}
              styles={{
                popup: {
                  root: { minWidth: 360, maxWidth: 'min(90vw, 960px)' },
                },
              }}
              placeholder='Выберите контрагента'
              allowClear
              showSearch
              optionFilterProp='label'
              optionLabelProp='label'
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              suffixIcon={<TeamOutlined />}
              popupRender={menu => (
                <>
                  {menu}
                  {onCreatePartner ? (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <Button type='link' icon={<PlusOutlined />} onClick={onCreatePartner}>
                        Добавить контрагента
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            >
              {refs.partners?.map(partner => (
                <Select.Option key={partner.id} value={partner.id} label={partner.name}>
                  {partner.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label='Проект' name='project_id'>
            <Select
              placeholder='Выберите проект'
              allowClear
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              suffixIcon={<ProjectOutlined />}
              onChange={handleProjectChange}
            >
              {refs.projects?.map(project => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label='Ответственный'
            name='responsible_id'
            rules={requireFullValidation ? [{ required: true, message: 'Выберите ответственного' }] : undefined}
          >
            <Select
              placeholder='Выберите ответственного'
              allowClear
              showSearch
              optionFilterProp='label'
              optionLabelProp='label'
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              suffixIcon={<UserOutlined />}
            >
              {refs.users?.map(user => (
                <Select.Option key={user.id} value={user.id} label={user.name}>
                  {user.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16} justify='end'>
        <Col xs={24} md={8}>
          <Form.Item
            label='Ответственный от ОУП'
            name='supplier_manager_id'
            rules={requireFullValidation ? [{ required: true, message: 'Выберите ответственного от ОУП' }] : undefined}
          >
            <Select
              placeholder='Выберите ответственного от ОУП'
              allowClear
              showSearch
              optionFilterProp='label'
              optionLabelProp='label'
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              suffixIcon={<UserOutlined />}
            >
              {refs.users?.map(user => (
                <Select.Option key={user.id} value={user.id} label={user.name}>
                  {user.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
