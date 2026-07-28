import type { ReactNode } from 'react';
import { FileExcelOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Switch } from 'antd';
import { Toolbar, Willow, type IApi } from '@svar-ui/react-gantt';

import { GANTT_UI } from './ganttFeatures';
import type { createGanttToolbarItems } from './ganttToolbar';
import styles from './GanttField.module.scss';

type ToolbarItems = ReturnType<typeof createGanttToolbarItems>;

type GanttChromeToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  api: IApi | null;
  toolbarItems: ToolbarItems;
  criticalPathEnabled: boolean;
  onCriticalPathEnabledChange: (value: boolean) => void;
  excelExporting: boolean;
  excelDisabled: boolean;
  onExcelExport: () => void;
};

export function GanttChromeToolbar({
  searchQuery,
  onSearchQueryChange,
  api,
  toolbarItems,
  criticalPathEnabled,
  onCriticalPathEnabledChange,
  excelExporting,
  excelDisabled,
  onExcelExport,
}: GanttChromeToolbarProps): ReactNode {
  return (
    <div className={styles.ganttToolbar}>
      <Input
        allowClear
        className={styles.search}
        prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
        placeholder='Фильтр: проект, договор, этап, задача…'
        value={searchQuery}
        onChange={event => onSearchQueryChange(event.target.value)}
      />

      <div className={styles.hotkeys}>
        <Willow>
          <Toolbar api={api ?? undefined} items={toolbarItems} />
        </Willow>
      </div>

      <div className={styles.toolbarExtras}>
        {GANTT_UI.criticalPath ? (
          <Switch
            checkedChildren='Критический путь'
            unCheckedChildren='Критический путь'
            checked={criticalPathEnabled}
            onChange={onCriticalPathEnabledChange}
          />
        ) : null}
        {GANTT_UI.excelExport ? (
          <Button
            icon={<FileExcelOutlined />}
            loading={excelExporting}
            disabled={excelDisabled}
            onClick={onExcelExport}
          >
            Excel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
