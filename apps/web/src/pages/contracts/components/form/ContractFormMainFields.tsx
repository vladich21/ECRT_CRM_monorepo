import {
  FileTextOutlined,
  NumberOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Col, Divider, Form, Input, Row, Select } from 'antd';

import type { ContractFormMode, ContractFormRefs } from './contractForm.types';

const { TextArea } = Input;

type Props = {
  mode: ContractFormMode;
  refs: ContractFormRefs;
};

export function ContractFormMainFields({ mode, refs }: Props) {
  const strict = mode === 'edit';

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
            rules={strict ? [{ required: true, message: 'Введите номер договора' }] : undefined}
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
            rules={strict ? [{ required: true, message: 'Введите название договора' }] : undefined}
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
            rules={strict ? [{ required: true, message: 'Выберите контрагента' }] : undefined}
          >
            <Select
              placeholder='Выберите контрагента'
              allowClear
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              suffixIcon={<TeamOutlined />}
            >
              {refs.partners?.map(partner => (
                <Select.Option key={partner.id} value={partner.id}>
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
            rules={strict ? [{ required: true, message: 'Выберите ответственного' }] : undefined}
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
    </>
  );
}
