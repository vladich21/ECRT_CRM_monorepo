import React, { useState } from 'react';
import { Card, Button, Tag, Row, Col, Dropdown, Modal, Form } from 'antd';
import { FilterOutlined, SettingOutlined, CloseOutlined } from '@ant-design/icons';
import { renderFilterField } from './widgets/FilterField';
import styles from './BasicFilters.module.scss';

export interface FilterFieldConfig {
  key: string;
  label: string;
  type: 'search' | 'select' | 'multi-select' | 'date' | 'date-range' | 'checkbox' | 'number-range';
  options?: { name: string; id: any }[];
  placeholder?: string;
  icon?: React.ReactNode;
  width?: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
}

export interface UniversalFiltersProps {
  filterConfig: FilterFieldConfig[];
  value: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
}

export const UniversalFilters: React.FC<UniversalFiltersProps> = ({ filterConfig, value = {}, onChange }) => {
  const [form] = Form.useForm();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const getFieldConfig = (key: string) => {
    return filterConfig.find(field => field.key === key);
  };

  const handleFilterChange = (key: string, filterValue: any) => {
    const newFilters = { ...value, [key]: filterValue };
    onChange(newFilters);
  };

  const removeFilter = (filterKey: string) => {
    const newFilters = { ...value };
    delete newFilters[filterKey];
    onChange(newFilters);
  };

  const clearAllFilters = () => {
    onChange({});
  };

  const getActiveFiltersCount = () => {
    return Object.values(value).filter(
      val => val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0),
    ).length;
  };

  const hasActiveFilters = getActiveFiltersCount() > 0;

  const renderField = (field: FilterFieldConfig) => renderFilterField(field, value, handleFilterChange);

  const getFilterDisplayValue = (key: string, value: any): string => {
    const config = getFieldConfig(key);
    if (!config) return String(value);

    if (Array.isArray(value)) {
      if (config.type === 'multi-select' || config.type === 'checkbox') {
        return value
          .map(val => {
            const option = config.options?.find(opt => opt.id === val);
            return option?.name || val;
          })
          .join(', ');
      }
    }

    if (config.type === 'select') {
      const option = config.options?.find(opt => opt.id === value);
      return option?.name || String(value);
    }

    return String(value);
  };

  return (
    <Card size='small' className={styles.card}>
      {/* 1. Верхняя строка - Активные фильтры слева, поиск и фильтры справа */}
      <div className={styles.topRow}>
        {/* Левая часть - активные фильтры */}
        <div className={styles.activeFiltersContainer}>
          {hasActiveFilters && (
            <div className={styles.activeFiltersList}>
              <span className={styles.activeFiltersLabel}>Активные фильтры:</span>

              {Object.entries(value).map(([key, val]) => {
                if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                  return null;
                }

                return (
                  <Tag key={key} closable onClose={() => removeFilter(key)} className={styles.filterTag}>
                    {getFieldConfig(key)?.label || key}
                    {getFieldConfig(key)?.type === 'search' ? null : `: ${getFilterDisplayValue(key, val)}`}
                  </Tag>
                );
              })}

              <Button type='link' size='small' onClick={clearAllFilters} className={styles.clearButton}>
                Очистить все
              </Button>
            </div>
          )}
        </div>

        {/* Правая часть - поиск и кнопка фильтров */}
        <div className={styles.controlsContainer}>
          {filterConfig.some(field => field.type === 'search') &&
            renderField(filterConfig.find(field => field.type === 'search')!)}

          <Dropdown
            menu={{
              items: [
                {
                  key: 'advanced',
                  label: 'Все фильтры',
                  icon: <SettingOutlined />,
                  onClick: () => setIsAdvancedOpen(true),
                },
                { type: 'divider' },
                {
                  key: 'clear',
                  label: 'Очистить все',
                  icon: <CloseOutlined />,
                  onClick: clearAllFilters,
                  disabled: !hasActiveFilters,
                },
              ],
            }}
            trigger={['click']}
          >
            <Button icon={<FilterOutlined />}>Фильтры {hasActiveFilters && `(${getActiveFiltersCount()})`}</Button>
          </Dropdown>
        </div>
      </div>

      {/* 4. Модальное окно всех фильтров */}
      <Modal
        title='Все фильтры'
        open={isAdvancedOpen}
        onCancel={() => setIsAdvancedOpen(false)}
        footer={[
          <Button key='reset' onClick={clearAllFilters}>
            Сбросить
          </Button>,
          <Button key='cancel' onClick={() => setIsAdvancedOpen(false)}>
            Отмена
          </Button>,
        ]}
        width={700}
      >
        <Form form={form} layout='vertical'>
          <Row gutter={16}>
            {filterConfig
              .filter(field => field.type !== 'search')
              .map(field => (
                <Col span={12} key={field.key} className={styles.modalFormCol}>
                  <Form.Item label={field.label}>{renderField(field)}</Form.Item>
                </Col>
              ))}
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};
