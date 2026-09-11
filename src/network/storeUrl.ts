import { STORE_URLS } from '../config';

export function resolveStoreUrl(): string {
  if (__NETWORK__ === 'web') return STORE_URLS.web;
  return /android/i.test(navigator.userAgent) ? STORE_URLS.android : STORE_URLS.ios;
}
