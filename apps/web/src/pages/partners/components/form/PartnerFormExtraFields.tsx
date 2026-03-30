import { ExperimentOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Input, Row, Select, Tag } from 'antd';

import { PartnerCompetence } from '../../../../types/partner';

import type { PartnerFormRefs } from './partnerForm.types';

import styles from '../../PartnerFormPage.module.scss';

const { TextArea } = Input;

type Props = {
  refs: PartnerFormRefs;
};

export function PartnerFormExtraFields({ refs }: Props) {
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
