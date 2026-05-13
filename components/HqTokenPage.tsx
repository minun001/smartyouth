'use client';

import DashboardView from './DashboardView';
import { useUrlToken } from '@/lib/useUrlToken';

export default function HqTokenPage() {
  const token = useUrlToken();
  return <DashboardView mode="hq" token={token} view="map" />;
}
