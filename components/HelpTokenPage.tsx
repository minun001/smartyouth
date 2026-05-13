'use client';

import HelpPageClient from './HelpPageClient';
import { useUrlToken } from '@/lib/useUrlToken';

export default function HelpTokenPage() {
  const token = useUrlToken();
  return <HelpPageClient token={token ?? undefined} />;
}
