'use client';

import { useSearchParams } from 'next/navigation';
import HelpPageClient from './HelpPageClient';

export default function HelpTokenPage() {
  const searchParams = useSearchParams();
  return <HelpPageClient token={searchParams.get('t') ?? undefined} />;
}
