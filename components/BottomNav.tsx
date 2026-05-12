'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type BottomNavProps = {
  boothNo?: number;
  token?: string | null;
};

export default function BottomNav({ boothNo, token }: BottomNavProps) {
  const pathname = usePathname();
  const suffix = token ? `?t=${encodeURIComponent(token)}` : '';
  const boothHref = boothNo ? `/booth/${boothNo}${suffix}` : `/hq${suffix}`;

  const items = [
    { label: '상황', href: '/', active: pathname === '/' || pathname === '/hq' },
    { label: '내부스', href: boothHref, active: pathname.startsWith('/booth') },
    { label: '지도', href: '/map', active: pathname === '/map' },
    { label: '도움', href: `/help${suffix}`, active: pathname === '/help' }
  ];

  return (
    <nav className="safe-nav fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-3 py-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex min-h-14 items-center justify-center rounded-lg text-base font-black ${
              item.active ? 'bg-slate-900 text-white' : 'text-slate-600 active:bg-slate-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
