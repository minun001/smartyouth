'use client';

import { useSearchParams } from 'next/navigation';
import DashboardView from './DashboardView';

export default function HqTokenPage() {
  const searchParams = useSearchParams();
  return <DashboardView mode="hq" token={searchParams.get('t')} view="map" />;
}
