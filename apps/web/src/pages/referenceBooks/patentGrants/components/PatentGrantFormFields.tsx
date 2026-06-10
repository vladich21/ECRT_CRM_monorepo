import { CalendarOutlined, CopyrightOutlined, FileTextOutlined, NumberOutlined, TeamOutlined } from '@ant-design/icons';
import { Col, DatePicker, Divider, Form, Input, Row, Select } from 'antd';
import { useMemo } from 'react';

import { useContractById } from '../../../../api/contracts/contractApiHooks';
import { usePatentById } from '../../../../api/patents/patentApiHooks';
import { PATENT_GRANT_OFFICE_OPTIONS } from '../../../../api/patents/patentGrantRegions';
import { getNameById } from '../../../../helpers/getNameById';
import { Reference } from '../../../../types/referenceTypes';
import { usePatentGrantRidLink } from '../hooks/usePatentGrantRidLink';
import { buildPatentSelectLabel, getContractDisplayLabel, getPatentExpectedLicenseeIds, getPatentGrantActualLicenseeIds, hasActualLicensee } from '../utils/patentGrantCardHelpers';
import styles from '../PatentGrantFormPage.module.scss';

export type PatentGrantPatentSelectFallback = { id: string; name: string };

const { TextArea } = Input;

type PartnerOption = { id: string; label: string; searchLabel: string; inn: string };

function buildOfficeSelectOptions(savedOffice?: string | null) {
  const opts = [...PATENT_GRANT_OFFICE_OPTIONS];
  const saved = savedOffice?.trim();
  if (saved && !opts.some(o => o.value === saved)) {
    opts.unshift({ value: saved, label: `${saved} (текущее в записи)` });
  }
  return opts;
}

function buildPartnerOptions(partners: Reference[] | undefined): PartnerOption[] {
  return (partners ?? []).map(partner => {
    const fullName = String(partner.name ?? '').trim();
    const label = String(partner.short_name ?? '').trim() || fullName || 'Контрагент без имени';
    const inn = String(partner.inn ?? '').trim();
    return { id: String(partner.id), label, searchLabel: `${label} ${fullName} ${inn}`.trim().toLowerCase(), inn };
  });
}

function PartnerSelect({
  name,
  label,
  multiple,
  options,
}: {
  name: string;
  label: string;
  multiple?: boolean;
  options: PartnerOption[];
}) {
  return (
    <Form.Item label={label} name={name}>
      <Select
        mode={multiple ? 'multiple' : undefined}
        maxTagCount={multiple ? 'responsive' : undefined}
        placeholder='Выберите контрагента или найдите по названию / ИНН'
        allowClear
        showSearch
        optionFilterProp='label'
        optionLabelProp='label'
        filterOption={(input, option) =>
          String((option as { searchLabel?: string }).searchLabel ?? option?.label ?? '')
            .includes(input.toLowerCase().trim())
        }
        suffixIcon={<TeamOutlined />}
      >
        {options.map(partner => (
          <Select.Option key={partner.id} value={partner.id} label={partner.label} searchLabel={partner.searchLabel}>
            <div>
              <div>{partner.label}</div>
              {partner.inn ? <div style={{ fontSize: 12, color: '#888' }}>ИНН {partner.inn}</div> : null}
            </div>
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  );
}

interface PatentGrantFormFieldsProps {
  referenceBooks: {
    patents?: Reference[];
    partners?: Reference[];
    projects?: Reference[];
    contracts?: Reference[];
  };
  savedOfficeForLegacy?: string | null;
  patentSelectFallback?: PatentGrantPatentSelectFallback | null;
  mode?: 'create' | 'edit';
  initialPatentId?: string;
  initialRidRegNumber?: string;
}

export function PatentGrantFormFields({
  referenceBooks,
  savedOfficeForLegacy,
  patentSelectFallback,
  mode = 'create',
  initialPatentId,
  initialRidRegNumber,
}: PatentGrantFormFieldsProps) {
  const form = Form.useFormInstance();
  const patentId = Form.useWatch('patent_id', form);
  const actualLicenseePartnerIds = Form.useWatch('actual_licensee_partner_ids', form);
  const isEdit = mode === 'edit';
  const showExpectedLicensee = !hasActualLicensee(actualLicenseePartnerIds);
  const { data: selectedPatent } = usePatentById(patentId ?? '');
  const { linkedRidRegNumber } = usePatentGrantRidLink({ patentId, selectedPatent, initialPatentId, initialRidRegNumber });

  const officeOptions = useMemo(() => buildOfficeSelectOptions(savedOfficeForLegacy), [savedOfficeForLegacy]);
  const partnerOptions = useMemo(() => buildPartnerOptions(referenceBooks.partners), [referenceBooks.partners]);
  const expectedLicenseeIds = useMemo(
    () => (patentId && selectedPatent?.id === patentId ? getPatentExpectedLicenseeIds(selectedPatent) : []),
    [patentId, selectedPatent],
  );

  const patentsForSelect = useMemo(() => {
    const list = [...(referenceBooks.patents ?? [])];
    const fallback = patentSelectFallback;
    if (!fallback?.id?.trim()) return list;
    const id = fallback.id.trim();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return [{ id, name: fallback.name }, ...list];
    if (!list[index]?.name?.trim() && fallback.name.trim()) {
      const next = [...list];
      next[index] = { ...list[index]!, name: fallback.name };
      return next;
    }
    return list;
  }, [referenceBooks.patents, patentSelectFallback]);

  const linkedContractId = selectedPatent?.contract_id?.trim() ?? '';
  const needContractFetch = Boolean(linkedContractId && !referenceBooks.contracts?.some(c => c.id === linkedContractId));
  const { data: linkedContractFetched } = useContractById(needContractFetch ? linkedContractId : '');
  const linkedContract =
    referenceBooks.contracts?.find(row => row.id === linkedContractId) ??
    (linkedContractFetched?.id === linkedContractId ? linkedContractFetched : undefined);

  return (
    <div className={styles.twoColSections}>
      <div className={styles.leftColumnStack}>
        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <CopyrightOutlined /> Основная информация
          </Divider>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label='Номер охранного документа'
                name='grant_number'
                rules={[{ required: true, message: 'Введите номер охранного документа' }]}
              >
                <Input placeholder='GR-2024-001' prefix={<NumberOutlined />} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item label='РИД' name='patent_id' rules={[{ required: true, message: 'Выберите РИД' }]}>
                <Select
                  placeholder='Выберите РИД'
                  allowClear
                  showSearch
                  optionLabelProp='label'
                  optionFilterProp='label'
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  suffixIcon={<CopyrightOutlined />}
                >
                  {patentsForSelect.map(patent => {
                    const label = buildPatentSelectLabel(patent);
                    return (
                      <Select.Option key={patent.id} value={patent.id} label={label}>
                        {label}
                      </Select.Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>

            {isEdit ? (
              <>
                <Col xs={24}>
                  <Form.Item label='Рег. номер РИД'>
                    <Input value={linkedRidRegNumber || '—'} readOnly disabled prefix={<NumberOutlined />} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label='Проект'>
                    <Input
                      value={getNameById(selectedPatent?.project_id, referenceBooks.projects) || '—'}
                      readOnly
                      disabled
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label='Договор (доходный)'>
                    <Input value={getContractDisplayLabel(linkedContract) || '—'} readOnly disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <PartnerSelect
                    name='actual_licensee_partner_ids'
                    label='Фактический лицензиат'
                    multiple
                    options={partnerOptions}
                  />
                </Col>
              </>
            ) : null}

            {showExpectedLicensee ? (
              <Col xs={24} md={isEdit ? 12 : 24}>
                <Form.Item label='Предполагаемый лицензиат' tooltip='Заполняется в карточке РИД'>
                  <Select
                    mode='multiple'
                    disabled
                    value={expectedLicenseeIds}
                    placeholder='Не указан'
                    optionLabelProp='label'
                    maxTagCount='responsive'
                    suffixIcon={<TeamOutlined />}
                  >
                    {partnerOptions.map(partner => (
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
            ) : null}
          </Row>
        </div>

        <div className={styles.sectionBox}>
          <Divider orientation='left' style={{ marginTop: 0 }}>
            <FileTextOutlined /> Дополнительная информация
          </Divider>
          <Form.Item label='Примечания' name='notes'>
            <TextArea placeholder='Введите дополнительные сведения о охранном документе' rows={3} />
          </Form.Item>
        </div>
      </div>

      <div className={styles.sectionBox}>
        <Divider orientation='left' style={{ marginTop: 0 }}>
          <CalendarOutlined /> Статус и даты
        </Divider>
        <Row gutter={16}>
          <Col xs={24}>
            <Form.Item label='Статус' name='status' rules={[{ required: true, message: 'Выберите статус' }]}>
              <Select placeholder='Выберите статус'>
                <Select.Option value='Активный'>Активный</Select.Option>
                <Select.Option value='Неактивный'>Неактивный</Select.Option>
                <Select.Option value='Истек'>Истек</Select.Option>
                <Select.Option value='Отозван'>Отозван</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label='Дата выдачи' name='grant_date'>
              <DatePicker placeholder='Выберите дату выдачи' style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label='Дата продления' name='renewal_date'>
              <DatePicker placeholder='Выберите дату продления' style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label='Ведомство' name='office'>
              <Select placeholder='Выберите ведомство' allowClear showSearch optionFilterProp='label' options={officeOptions} />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </div>
  );
}
