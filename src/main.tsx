import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';

// Register PWA Service Worker on web only (Capacitor Android APK bundles /data locally)
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform()
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration notice:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
