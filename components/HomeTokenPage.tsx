'use client';

import { useSearchParams } from 'next/navigation';
import DashboardView from './DashboardView';

export default function HomeTokenPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('t');

  return <DashboardView mode={token ? 'hq' : 'public'} token={token} />;
}
