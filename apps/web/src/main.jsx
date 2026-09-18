import '@ant-design/v5-patch-for-react-19';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import App from './App';
import { AppProviders } from './AppProviders';

import './main.css';

/** 4xx — нарушение бизнес-правила или прав, повтор ничего не изменит и только плодит шум в логах. */
function shouldRetryQuery(failureCount, error) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status != null && status >= 400 && status < 500) return false;
  return failureCount < 3;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000,
      retry: shouldRetryQuery,
    },
    mutations: {
      staleTime: 30 * 60 * 1000,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <App />
        </AppProviders>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);

dayjs.locale('ru');
