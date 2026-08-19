import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from '@/app/providers/AppProvider';
import { AppRouter } from '@/app/router';
import '@/styles/globals.css';

// Unregister stale service workers to ensure fresh runtime bundle execution
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <AppRouter />
    </AppProvider>
  </React.StrictMode>
);
