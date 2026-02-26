import React from 'react';
import { Select, SelectProps } from 'antd';
import { GlobalOutlined, PlusOutlined } from '@ant-design/icons';
import { Option } from 'antd/es/mentions';
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
      <Option value='add-new' disabled style={{ cursor: 'pointer' }}>
        <div className={styles.addOptionContainer} onClick={handleAddOptionClick}>
          <PlusOutlined />
          <span>{addText}</span>
        </div>
      </Option>
      {references.map(area => (
        <Option key={area.id.toString()} value={area.id.toString()}>
          {area.name}
        </Option>
      ))}
    </Select>
  );
};
