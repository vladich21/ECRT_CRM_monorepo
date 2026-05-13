import { IdcardOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Row, Switch, Tooltip } from 'antd';

import styles from '../../PartnerFormPage.module.scss';

type Props = {
  formMode: 'create' | 'edit';
};

const ARCHIVE_SWITCH_HELP =
  'При архивации все активные оценки поставщика переводятся в архив. ' +
  'Для инжиниринговых контрагентов статус «Активный/Потенциальный» определяется автоматически по наличию активных проектных оценок и через этот переключатель не управляется (только перевод в Архив и обратно).';

export function PartnerFormFlagsFields({ formMode }: Props) {
  return (
    <div className={styles.sectionBox}>
      <Divider orientation='left' style={{ marginTop: 0 }}>
        <IdcardOutlined /> Флаги
      </Divider>
      <Row gutter={16}>
        <Col xs={24}>
          <Form.Item label='Ключевой поставщик' name='is_key_supplier' valuePropName='checked'>
            <Switch checkedChildren='Да' unCheckedChildren='Нет' />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label='Целевой поставщик' name='is_targeted' valuePropName='checked'>
            <Switch checkedChildren='Да' unCheckedChildren='Нет' />
          </Form.Item>
        </Col>
        {formMode === 'edit' && (
          <Col xs={24}>
            <Form.Item
              label='Архивировать'
              name='manual_archive'
              valuePropName='checked'
              tooltip={ARCHIVE_SWITCH_HELP}
            >
              <Tooltip title={ARCHIVE_SWITCH_HELP}>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' />
              </Tooltip>
            </Form.Item>
          </Col>
        )}
      </Row>
    </div>
  );
}
