import { ProjectOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, Row, Select } from 'antd';
import { useMemo } from 'react';

import type { Contract } from '@/types/contract';
import type { Reference } from '@/types/referenceTypes';

import type { PatentFormRefs } from './patentForm.types';

import styles from '../../PatentFormPage.module.scss';

type Props = {
  refs: PatentFormRefs;
  incomeContracts: Contract[];
  partnerOptions?: Reference[];
  onProjectChange: (value: string | null) => void;
};

function buildPartnerSelectOptions(partners: Reference[] | undefined) {
  return (partners ?? []).map(partner => {
    const shortName = String(partner.short_name ?? '').trim();
    const fullName = String(partner.name ?? '').trim();
    const displayLabel = shortName || fullName || 'Контрагент без имени';
    const inn = String(partner.inn ?? '').trim();
    const searchLabel = `${displayLabel} ${inn}`.trim().toLowerCase();
    return { id: String(partner.id), label: displayLabel, searchLabel, inn };
  });
}

export function PatentFormOrgFields({ refs, incomeContracts, partnerOptions, onProjectChange }: Props) {
  const partnerSelectOptions = useMemo(
    () => buildPartnerSelectOptions(partnerOptions ?? refs.partners),
    [partnerOptions, refs.partners],
  );
  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left'>
        <TeamOutlined /> Организация и ответственные
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label='Отдел' name='department_id' rules={[{ required: true, message: 'Выберите отдел' }]}>
            <Select
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите отдел'
              suffixIcon={<TeamOutlined />}
            >
              {refs.departments?.map(dept => (
                <Select.Option key={dept.id} value={dept.id}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item label='Ответственный за патентование' name='responsible_for_patenting_id'>
            <Select
              showSearch
              optionFilterProp='label'
              optionLabelProp='label'
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите ответственного'
              allowClear
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

      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label='Исполнители' name='author_ids'>
            <Select
              mode='multiple'
              showSearch
              maxTagCount='responsive'
              optionFilterProp='label'
              optionLabelProp='label'
              filterOption={(input, option) =>
                String(option?.label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите исполнителей'
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

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label='Проект' name='project_id'>
            <Select
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите проект'
              allowClear
              onChange={onProjectChange}
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
          <Form.Item label='Номер проекта' name='project_code'>
            <Input placeholder='-' disabled />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item label='Договор (доходный)' name='contract_id'>
            <Select
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) =>
                String(option?.children ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              placeholder='Выберите договор'
              allowClear
            >
              {incomeContracts.map(row => {
                const base = row.number || row.name || row.id;
                const label = row.is_active === false ? `${base} (закрыт)` : base;
                return (
                  <Select.Option key={row.id} value={row.id}>
                    {label}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label='Предполагаемый лицензиат' name='expected_licensee_partner_ids'>
            <Select
              mode='multiple'
              maxTagCount='responsive'
              placeholder='Выберите контрагента или введите ИНН'
              allowClear
              showSearch
              optionFilterProp='label'
              optionLabelProp='label'
              filterOption={(input, option) =>
                String((option as { searchLabel?: string } | undefined)?.searchLabel ?? option?.label ?? '')
                  .includes(input.toLowerCase().trim())
              }
              suffixIcon={<TeamOutlined />}
            >
              {partnerSelectOptions.map(partner => (
                <Select.Option
                  key={partner.id}
                  value={partner.id}
                  label={partner.label}
                  searchLabel={partner.searchLabel}
                >
                  <div>
                    <div>{partner.label}</div>
                    {partner.inn ? <div style={{ fontSize: 12, color: '#888' }}>ИНН {partner.inn}</div> : null}
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>
  );
}
