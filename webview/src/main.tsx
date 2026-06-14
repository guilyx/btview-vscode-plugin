import { createRoot } from 'react-dom/client';
import './hostMessages';
import { App } from './App';
import { ErrorBoundary } from './ErrorBoundary';
import { installBootErrorHandlers } from './boot';
import './styles.css';

installBootErrorHandlers();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element');
}

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
