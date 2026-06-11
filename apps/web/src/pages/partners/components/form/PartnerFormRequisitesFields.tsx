import { BankOutlined, CloudDownloadOutlined, IdcardOutlined } from '@ant-design/icons';
import { Button, Col, Divider, Form, Input, Row, Space, Tooltip } from 'antd';

import { innRequiredFormRules } from '@/helpers/innValidation';

import styles from '../../PartnerFormPage.module.scss';

type Props = {
  getFieldStatus: (fieldName: string) => 'error' | undefined;
  onUploadByInn?: () => void;
  isLoadingInn?: boolean;
};

export function PartnerFormRequisitesFields({ getFieldStatus, onUploadByInn, isLoadingInn }: Props) {
  return (
    <>
      <Divider orientation='left'>
        <BankOutlined /> Реквизиты и идентификация
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={4}>
          <Form.Item
            label='ИНН'
            name='inn'
            validateStatus={getFieldStatus('inn')}
            rules={innRequiredFormRules}
          >
            <Space.Compact className={styles.innInputContainer}>
              <Form.Item name='inn' noStyle>
                <Input
                  placeholder='Введите ИНН'
                  prefix={<BankOutlined />}
                  className={styles.innInput}
                  status={getFieldStatus('inn')}
                />
              </Form.Item>
              {onUploadByInn && (
                <Tooltip title='Загрузить данные компании по ИНН'>
                  <Button type='primary' icon={<CloudDownloadOutlined />} onClick={onUploadByInn} loading={isLoadingInn} />
                </Tooltip>
              )}
            </Space.Compact>
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
          <Form.Item
            label='КПП'
            name='kpp'
            validateStatus={getFieldStatus('kpp')}
            rules={[
              { required: true, message: 'Введите КПП' },
              { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр' },
            ]}
          >
            <Input placeholder='Введите КПП' prefix={<BankOutlined />} status={getFieldStatus('kpp')} />
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
          <Form.Item
            label='ОГРН'
            name='ogrn'
            validateStatus={getFieldStatus('ogrn')}
            rules={[{ pattern: /^$|^\d{13}$|^\d{15}$/, message: 'ОГРН должен содержать 13 или 15 цифр' }]}
          >
            <Input placeholder='Введите ОГРН' prefix={<BankOutlined />} status={getFieldStatus('ogrn')} />
          </Form.Item>
        </Col>

        <Col xs={24} md={8}>
          <Form.Item
            label='Полное наименование'
            name='name'
            rules={[{ required: true, message: 'Введите полное наименование' }]}
          >
            <Input placeholder='Введите полное наименование' prefix={<IdcardOutlined />} />
          </Form.Item>
        </Col>

        <Col xs={24} md={4}>
          <Form.Item label='Краткое наименование' name='short_name'>
            <Input placeholder='Введите краткое наименование' prefix={<IdcardOutlined />} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
