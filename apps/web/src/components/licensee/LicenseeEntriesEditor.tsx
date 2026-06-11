import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Select, Tooltip } from 'antd';

import { EMPTY_LICENSEE_FORM_ENTRY } from '@/helpers/licenseeEntryHelpers';
import {
  buildLicenseeInnFormRules,
  buildLicenseeNameFormRules,
} from '@/helpers/licenseeEntryFormRules';
import type { LicenseeEntry } from '@/types/licenseeEntry';
import type { Reference } from '@/types/referenceTypes';

import styles from './LicenseeEntriesEditor.module.scss';

export type LicenseePartnerOption = {
  id: string;
  label: string;
  searchLabel: string;
  inn: string;
};

export function buildLicenseePartnerOptions(partners: Reference[] | undefined): LicenseePartnerOption[] {
  return (partners ?? []).map(partner => {
    const fullName = String(partner.name ?? '').trim();
    const label = String(partner.short_name ?? '').trim() || fullName || 'Контрагент без имени';
    const inn = String(partner.inn ?? '').trim();
    return {
      id: String(partner.id),
      label,
      searchLabel: `${label} ${fullName} ${inn}`.trim().toLowerCase(),
      inn,
    };
  });
}

type Props = {
  name?: string;
  label: string;
  partnerOptions: LicenseePartnerOption[];
  disabled?: boolean;
  readonlyEntries?: LicenseeEntry[];
  tooltip?: string;
};

function resolveReadonlyPartnerOptions(
  entries: LicenseeEntry[],
  partnerOptions: LicenseePartnerOption[],
): LicenseePartnerOption[] {
  const options = [...partnerOptions];
  const knownIds = new Set(options.map(option => option.id));
  for (const entry of entries) {
    if (!entry.partner_id || knownIds.has(entry.partner_id)) continue;
    options.unshift({
      id: entry.partner_id,
      label: entry.name.trim() || 'Контрагент',
      searchLabel: entry.name.trim().toLowerCase(),
      inn: entry.inn?.trim() ?? '',
    });
  }
  return options;
}

function LicenseeReadonlyRows({
  entries,
  partnerOptions,
}: {
  entries: LicenseeEntry[];
  partnerOptions: LicenseePartnerOption[];
}) {
  const options = resolveReadonlyPartnerOptions(entries, partnerOptions);

  if (entries.length === 0) {
    return <Input disabled readOnly value='—' placeholder='Не указан' />;
  }

  return (
    <div className={styles.readonlyRows}>
      {entries.map((entry, index) => (
        <Row key={`${entry.partner_id ?? 'manual'}-${entry.name}-${entry.inn ?? ''}-${index}`} gutter={8} align='middle' wrap={false}>
          <Col flex='220px'>
            <Select
              disabled
              style={{ width: '100%' }}
              value={entry.partner_id || undefined}
              placeholder='—'
              optionLabelProp='label'
              options={options.map(partner => ({ value: partner.id, label: partner.label }))}
              suffixIcon={<TeamOutlined />}
            />
          </Col>
          <Col flex='auto'>
            <Input disabled readOnly value={entry.name || '—'} placeholder='Название' />
          </Col>
          <Col flex='140px'>
            <Input disabled readOnly value={entry.inn || ''} placeholder='ИНН' />
          </Col>
        </Row>
      ))}
    </div>
  );
}

export function LicenseeEntriesEditor(props: Props) {
  if (props.readonlyEntries !== undefined) {
    return (
      <Form.Item
        className={styles.licenseeFormItem}
        label={props.label}
        tooltip={props.tooltip}
        labelCol={{ span: 24 }}
      >
        <LicenseeReadonlyRows entries={props.readonlyEntries} partnerOptions={props.partnerOptions} />
      </Form.Item>
    );
  }

  if (!props.name) return null;

  return <LicenseeEntriesEditorForm {...props} name={props.name} />;
}

function LicenseeEntriesEditorForm({
  name,
  label,
  partnerOptions,
  disabled,
  tooltip,
}: Required<Pick<Props, 'name' | 'label' | 'partnerOptions'>> & Pick<Props, 'disabled' | 'tooltip'>) {
  const form = Form.useFormInstance();

  const applyPartnerSelection = (fieldIndex: number, partnerId?: string) => {
    if (!partnerId) return;
    const partner = partnerOptions.find(row => row.id === partnerId);
    if (!partner) return;
    const entries = [...(form.getFieldValue(name) ?? [])];
    const current = entries[fieldIndex] ?? {};
    entries[fieldIndex] = {
      ...current,
      partner_id: partnerId,
      name: partner.label,
      inn: partner.inn || current.inn || '',
    };
    form.setFieldValue(name, entries);
  };

  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <div className={styles.listWrap}>
          <div className={styles.labelRow}>
            <span className={styles.fieldLabel}>
              {label}
              {tooltip ? (
                <Tooltip title={tooltip}>
                  <QuestionCircleOutlined className={styles.fieldTooltipIcon} />
                </Tooltip>
              ) : null}
            </span>
            {!disabled ? (
              <Button
                type='dashed'
                htmlType='button'
                icon={<PlusOutlined />}
                className={styles.addButton}
                onClick={() => add({ ...EMPTY_LICENSEE_FORM_ENTRY })}
              >
                Добавить лицензиата
              </Button>
            ) : null}
          </div>
          <Form.Item className={styles.licenseeRowsItem} label={null} colon={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fields.map(field => (
                <Row key={field.key} gutter={8} align='middle' wrap={false}>
                  <Col flex='220px'>
                    <Form.Item name={[field.name, 'partner_id']} noStyle>
                      <Select
                        placeholder='Из справочника'
                        allowClear
                        showSearch
                        disabled={disabled}
                        optionFilterProp='label'
                        optionLabelProp='label'
                        filterOption={(input, option) =>
                          String((option as { searchLabel?: string }).searchLabel ?? option?.label ?? '')
                            .includes(input.toLowerCase().trim())
                        }
                        suffixIcon={<TeamOutlined />}
                        onChange={value => applyPartnerSelection(field.name, value ?? undefined)}
                      />
                    </Form.Item>
                  </Col>
                  <Col flex='auto'>
                    <Form.Item
                      name={[field.name, 'name']}
                      noStyle
                      validateTrigger={[]}
                      rules={disabled ? undefined : buildLicenseeNameFormRules(name, field.name)}
                    >
                      <Input placeholder='Название' disabled={disabled} />
                    </Form.Item>
                  </Col>
                  <Col flex='140px'>
                    <Form.Item
                      name={[field.name, 'inn']}
                      noStyle
                      validateTrigger={[]}
                      rules={disabled ? undefined : buildLicenseeInnFormRules(name, field.name)}
                    >
                      <Input placeholder='ИНН' disabled={disabled} />
                    </Form.Item>
                  </Col>
                  {!disabled ? (
                    <Col flex='none'>
                      <Button
                        type='text'
                        danger
                        icon={<DeleteOutlined />}
                        aria-label='Удалить лицензиата'
                        onClick={() => remove(field.name)}
                      />
                    </Col>
                  ) : null}
                </Row>
              ))}
            </div>
          </Form.Item>
        </div>
      )}
    </Form.List>
  );
}
