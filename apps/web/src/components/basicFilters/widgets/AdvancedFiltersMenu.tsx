import React from 'react';
import { Menu, Space } from 'antd';
import { SettingOutlined, CloseOutlined } from '@ant-design/icons';

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
