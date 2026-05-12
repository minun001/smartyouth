'use client';

export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === 'true';
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function appPath(path: string) {
  if (!basePath) return path;
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
