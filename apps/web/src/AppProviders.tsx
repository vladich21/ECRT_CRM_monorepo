import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';

import { antdThemeToken } from './antdAppTheme';
import { useReducedMotion } from './hooks/useReducedMotion';

export function AppProviders({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: { ...antdThemeToken, ...(reducedMotion ? { motion: false } : {}) },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
