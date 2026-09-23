import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { applyThemeToDocument } from './utils/theme';
import './index.css';

if (typeof window !== 'undefined') {
  (window as any).applyThemeToDocument = applyThemeToDocument;
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Ocorreu um erro ao carregar a página">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
