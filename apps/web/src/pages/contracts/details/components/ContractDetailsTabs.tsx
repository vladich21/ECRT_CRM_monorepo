import { Tabs } from 'antd';

import type { ContractDetailsTabItem, ContractDetailsTabKey } from '@/pages/contracts/utils/contractDetailsUtils';
import styles from '../ContractDetails.module.scss';

type ContractDetailsTabsProps = {
  activeTab: ContractDetailsTabKey;
  tabs: ContractDetailsTabItem[];
  onChange: (tabKey: ContractDetailsTabKey) => void;
};
export function ContractDetailsTabs({ activeTab, tabs, onChange }: ContractDetailsTabsProps) {
  const tabItems = tabs.map(({ key, label, count }) => ({
    key,
    label:
      count !== undefined ? (
        <>
          {label}
          <span className={styles.tabCount}>{count}</span>
        </>
      ) : (
        label
      ),
  }));
  return (
    <div className={styles.pageTabs}>
      <Tabs
        activeKey={activeTab}
        items={tabItems}
        onChange={key => onChange(key as ContractDetailsTabKey)}
        tabBarStyle={{ margin: 0, borderBottom: 'none' }}
      />
    </div>
  );
}
