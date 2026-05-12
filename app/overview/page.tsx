import { Suspense } from 'react';
import OverviewTokenPage from '@/components/OverviewTokenPage';

export default function OverviewPage() {
  return (
    <Suspense fallback={null}>
      <OverviewTokenPage />
    </Suspense>
  );
}
