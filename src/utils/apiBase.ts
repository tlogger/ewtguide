import { Capacitor } from '@capacitor/core';

export type PoiDataMode = 'local' | 'cdn';

const DEFAULT_API_BASE_URL = 'https://ewtguide.vercel.app';

export function getPoiDataMode(): PoiDataMode {
  const raw = (import.meta.env?.VITE_POI_DATA_MODE || '').toString().trim().toLowerCase();
  if (raw === 'local') return 'local';
  if (raw === 'cdn') return 'cdn';
  // Default to local in Vite dev server unless explicitly overridden, cdn in production build
  return import.meta.env?.DEV ? 'local' : 'cdn';
}

export function getApiBaseUrl(): string {
  try {
    if (Capacitor.isNativePlatform()) {
      return (import.meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    }
  } catch {
    // non-Capacitor test/node environment
  }
  return '';
}
