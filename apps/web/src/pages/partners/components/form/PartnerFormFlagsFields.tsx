import { IdcardOutlined } from '@ant-design/icons';
import { Col, Divider, Form, Row, Switch, Tooltip } from 'antd';

import type { PartnerFormRefs } from './partnerForm.types';
import styles from '../../PartnerFormPage.module.scss';

type Props = {
  formMode: 'create' | 'edit';
  refs?: PartnerFormRefs;
};

const ARCHIVE_SWITCH_HELP =
  'При архивации все активные оценки поставщика переводятся в архив. ' +
  'Для инжиниринговых контрагентов статус «Активный/Потенциальный» определяется автоматически по наличию активных проектных оценок и через этот переключатель не управляется (только перевод в Архив и обратно).';

const ACTIVE_SWITCH_HELP =
  'Для ресурсных контрагентов статус «Активный/Потенциальный» переключается вручную. Авто-логика на ресурсных не распространяется.';

function isResourceCategory(categoryId: unknown, refs?: PartnerFormRefs): boolean {
  if (!categoryId || !refs?.partnerCategories) return false;
  const found = refs.partnerCategories.find((cat) => String(cat.id) === String(categoryId));
  const name = (found?.name ?? '').toLowerCase();
  return name.includes('ресурс');
}

export function PartnerFormFlagsFields({ formMode, refs }: Props) {
  const categoryId = Form.useWatch('category_id');
  const isResource = isResourceCategory(categoryId, refs);
  const showActiveSwitch = formMode === 'edit' && isResource;

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
        {showActiveSwitch && (
          <Col xs={24}>
            <Form.Item
              label='Активный поставщик'
              name='manual_active'
              valuePropName='checked'
              tooltip={ACTIVE_SWITCH_HELP}
            >
              <Tooltip title={ACTIVE_SWITCH_HELP}>
                <Switch checkedChildren='Да' unCheckedChildren='Нет' />
              </Tooltip>
            </Form.Item>
          </Col>
        )}
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
