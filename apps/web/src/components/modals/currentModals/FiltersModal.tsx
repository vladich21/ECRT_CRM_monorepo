import { Button, Col, Form, Row } from 'antd';
import { ReactNode } from 'react';
import { BaseModal, BaseModalProps } from '../BaseModal';
import { FilterFieldConfig } from '../../basicFilters/BasicFilters';

export interface FiltersModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  form: any;
  filterConfig: FilterFieldConfig[];
  renderFilterField: (field: FilterFieldConfig) => ReactNode;
  setIsAdvancedOpen: (val: boolean) => void;
  clearAllFilters: () => void;
  excludeTypes?: string[];
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  form,
  filterConfig,
  renderFilterField,
  setIsAdvancedOpen,
  clearAllFilters,
  excludeTypes = ['search'], // По умолчанию исключаем поиск
  ...layoutProps
}) => {
  const footer = [
    <Button key='reset' onClick={clearAllFilters}>
      Сбросить
    </Button>,
    <Button key='cancel' onClick={() => setIsAdvancedOpen(false)}>
      Отмена
    </Button>,
    <Button key='apply' type='primary' onClick={() => setIsAdvancedOpen(false)}>
      Применить
    </Button>,
  ];

  // Фильтрация полей для модалки
  const modalFilterConfig = filterConfig.filter(field => !excludeTypes.includes(field.type));

  return (
    <BaseModal {...layoutProps} footer={footer}>
      <Form form={form} layout='vertical'>
        <Row gutter={16}>
          {modalFilterConfig.map(field => (
            <Col span={12} key={field.key} style={{ marginBottom: 16 }}>
              <Form.Item label={field.label} name={field.key} style={{ marginBottom: 8 }}>
                {renderFilterField(field)}
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </BaseModal>
  );
};
