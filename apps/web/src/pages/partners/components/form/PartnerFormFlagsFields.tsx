import { IdcardOutlined } from '@ant-design/icons';
import { Alert, Col, Divider, Form, Row, Switch } from 'antd';

import type { PartnerFormRefs } from './partnerForm.types';
import styles from '../../PartnerFormPage.module.scss';

export type PartnerBlockUiMode = 'none' | 'manual' | 'auto_score';

type Props = {
  formMode: 'create' | 'edit';
  refs?: PartnerFormRefs;
  /** Как сейчас заблокирован контрагент целиком (не путать с блоками по проектам). */
  blockUiMode?: PartnerBlockUiMode;
  /** Число активных блоков по проектам — только подсказка, на чекбокс не влияет. */
  projectBlocksCount?: number;
  /** Нельзя снять блокировку: средняя оценка &lt; 2 (инжиниринг). */
  unblockLockedByLowScore?: boolean;
};

const ARCHIVE_SWITCH_HELP =
  'При архивации все активные оценки поставщика переводятся в архив. ' +
  'Для инжиниринговых контрагентов статус «Активный/Потенциальный» определяется автоматически по наличию активных проектных оценок и через этот переключатель не управляется (только перевод в Архив и обратно).';

const ACTIVE_SWITCH_HELP =
  'Для ресурсных контрагентов статус «Активный/Потенциальный» переключается вручную. Авто-логика на ресурсных не распространяется.';

const BLOCKED_SWITCH_HELP =
  'Ручная блокировка всего контрагента (статус «Заблокирован»). При первой блокировке потребуется указать причину. ' +
  'Блокировка по отдельному проекту (вкладка «Оценки») статус контрагента не меняет.';

function isResourceCategory(categoryId: unknown, refs?: PartnerFormRefs): boolean {
  if (!categoryId || !refs?.partnerCategories) return false;
  const found = refs.partnerCategories.find((cat) => String(cat.id) === String(categoryId));
  const name = (found?.name ?? '').toLowerCase();
  return name.includes('ресурс');
}

export function PartnerFormFlagsFields({
  formMode,
  refs,
  blockUiMode = 'none',
  projectBlocksCount = 0,
  unblockLockedByLowScore = false,
}: Props) {
  const categoryId = Form.useWatch('category_id');
  const manualArchive = Form.useWatch('manual_archive');
  const manualBlocked = Form.useWatch('manual_blocked');
  const isResource = isResourceCategory(categoryId, refs);
  const showActiveSwitch = formMode === 'edit' && isResource;
  const isAutoScoreBlocked = blockUiMode === 'auto_score';
  const cannotTurnOffBlock = isAutoScoreBlocked || unblockLockedByLowScore;
  const blockSwitchDisabled = Boolean(manualArchive) || cannotTurnOffBlock;

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
              <Switch checkedChildren='Да' unCheckedChildren='Нет' disabled={Boolean(manualBlocked)} />
            </Form.Item>
          </Col>
        )}
        {formMode === 'edit' && (
          <Col xs={24}>
            <Form.Item
              label='Заблокировать контрагента'
              name='manual_blocked'
              valuePropName='checked'
              tooltip={BLOCKED_SWITCH_HELP}
            >
              <Switch
                checkedChildren='Да'
                unCheckedChildren='Нет'
                disabled={blockSwitchDisabled}
              />
            </Form.Item>
            {isAutoScoreBlocked || (unblockLockedByLowScore && blockUiMode === 'manual') ? (
              <Alert
                type='warning'
                showIcon
                style={{ marginBottom: 16 }}
                message={isAutoScoreBlocked ? 'Автоблокировка по оценкам' : 'Снять блокировку нельзя'}
                description={
                  isAutoScoreBlocked
                    ? 'Статус «Заблокирован» выставлен автоматически (средняя оценка по проектам ниже 2). ' +
                      'Снять чекбоксом нельзя — сначала улучшите оценки переоценкой. ' +
                      'Блокировки отдельных проектов — это другое (см. вкладку «Оценки»).'
                    : 'Ручная блокировка есть, но средняя оценка по проектам все еще ниже 2 — после снятия статус снова станет «Заблокирован». Сначала улучшите оценки.'
                }
              />
            ) : null}
            {projectBlocksCount > 0 && blockUiMode === 'none' ? (
              <Alert
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
                message={`Есть блокировки по проектам: ${projectBlocksCount}`}
                description={
                  'Это ограничение по отдельным проектам. Статус контрагента при этом может оставаться «Активный». ' +
                  'Чекбокс выше — только для блокировки всего контрагента.'
                }
              />
            ) : null}
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
              <Switch
                checkedChildren='Да'
                unCheckedChildren='Нет'
                disabled={Boolean(manualBlocked) && !cannotTurnOffBlock}
              />
            </Form.Item>
          </Col>
        )}
      </Row>
    </div>
  );
}
