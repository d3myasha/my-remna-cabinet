import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { clearStaleSessionIfNeeded } from './utils/token';
import { AppWithNavigator } from './AppWithNavigator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initLogoPreload } from './api/branding';
import './i18n';
import './styles/globals.css';

clearStaleSessionIfNeeded(null);

if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initLogoPreload());
} else {
  setTimeout(initLogoPreload, 100);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary level="app">
      <QueryClientProvider client={queryClient}>
        <AppWithNavigator />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
