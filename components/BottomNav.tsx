'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { basePath } from '@/lib/clientConfig';

type BottomNavProps = {
  boothNo?: number;
  token?: string | null;
  hqMode?: boolean;
};

export default function BottomNav({ token, hqMode }: BottomNavProps) {
  void token;
  void hqMode;
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);
  const statusHref = '/';
  const overviewHref = '/overview';
  const helpHref = '/help';

  const items = [
    {
      label: '상황',
      href: statusHref,
      active: currentPath === '/' || currentPath === '/hq' || currentPath === '/map' || currentPath.startsWith('/booth')
    },
    { label: '전체상황', href: overviewHref, active: currentPath === '/overview' },
    { label: '도움', href: helpHref, active: currentPath === '/help' }
  ];

  return (
    <nav className="safe-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 shadow-[0_-12px_30px_rgba(0,96,176,0.12)] backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-3 gap-2 px-3 py-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex min-h-14 items-center justify-center rounded-lg text-base font-black ${
              item.active
                ? 'bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] text-white'
                : 'bg-slate-50 text-slate-600 active:bg-slate-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function normalizePath(pathname: string) {
  let path = pathname || '/';
  if (basePath && path === basePath) path = '/';
  if (basePath && path.startsWith(`${basePath}/`)) path = path.slice(basePath.length);
  if (!path.startsWith('/')) path = `/${path}`;
  return path === '/' ? path : path.replace(/\/+$/, '');
}
