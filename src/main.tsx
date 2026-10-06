import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Offline support could not be registered:', error);
    });
  });
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.filter((name) => name.startsWith('youssef-')).map((name) => caches.delete(name)));
    });
  });
}
