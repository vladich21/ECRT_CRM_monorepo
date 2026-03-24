import React from 'react';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, Space } from 'antd';

interface AdvancedFiltersMenuProps {
  onOpenAdvanced: () => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export const AdvancedFiltersMenu: React.FC<AdvancedFiltersMenuProps> = ({
  onOpenAdvanced,
  onClearAll,
  hasActiveFilters,
}) => {
  return (
    <Menu>
      <Menu.Item onClick={onOpenAdvanced}>
        <Space>
          <SettingOutlined />
          Все фильтры
        </Space>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item onClick={onClearAll} disabled={!hasActiveFilters}>
        <Space>
          <CloseOutlined />
          Очистить все
        </Space>
      </Menu.Item>
    </Menu>
  );
};
