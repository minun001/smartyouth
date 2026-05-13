'use client';

import DashboardView from './DashboardView';
import { useUrlToken } from '@/lib/useUrlToken';

export default function OverviewTokenPage() {
  const token = useUrlToken();

  return <DashboardView mode={token ? 'hq' : 'public'} token={token} view="overview" />;
}
