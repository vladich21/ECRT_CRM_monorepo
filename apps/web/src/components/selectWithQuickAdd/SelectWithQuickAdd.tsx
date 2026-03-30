import React from 'react';
import { GlobalOutlined, PlusOutlined } from '@ant-design/icons';
import { Select, SelectProps } from 'antd';

import { Reference } from '../../types/referenceTypes';
import styles from './SelectWithQuickAdd.module.scss';

interface SelectWithQuickAddProps extends SelectProps {
  references: Reference[];
  isLoading?: boolean;
  addText: string;
  placeholder: string;
  handleOpenModal: () => void;
}

export const SelectWithQuickAdd: React.FC<SelectWithQuickAddProps> = ({
  references,
  addText,
  placeholder,
  handleOpenModal,
  ...props
}) => {
  const handleAddOptionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleOpenModal();
  };

  return (
    <Select
      {...props}
      mode='multiple'
      showSearch
      optionFilterProp='children'
      filterOption={(input, option) => {
        if (option?.value === 'add-new') return false;
        return String(option?.children ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
      placeholder={placeholder}
      suffixIcon={<GlobalOutlined />}
      onSelect={value => {
        if (value === 'add-new') {
          handleOpenModal();
        }
      }}
    >
      <Select.Option value='add-new' disabled style={{ cursor: 'pointer' }}>
        <div className={styles.addOptionContainer} onClick={handleAddOptionClick}>
          <PlusOutlined />
          <span>{addText}</span>
        </div>
      </Select.Option>
      {references.map(area => (
        <Select.Option key={area.id.toString()} value={area.id.toString()}>
          {area.name}
        </Select.Option>
      ))}
    </Select>
  );
};
