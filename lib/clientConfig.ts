'use client';

export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === 'true';
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
export const realtimeUrl =
  process.env.NEXT_PUBLIC_REALTIME_URL ??
  (apiBaseUrl ? `${apiBaseUrl.replace(/^http/, 'ws')}/ws` : '');

export function appPath(path: string) {
  if (!basePath) return path;
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiPath(path: string) {
  if (!apiBaseUrl) return appPath(path);
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
