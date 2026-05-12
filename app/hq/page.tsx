import HqTokenPage from '@/components/HqTokenPage';
import { Suspense } from 'react';

export default function HqPage() {
  return (
    <Suspense fallback={null}>
      <HqTokenPage />
    </Suspense>
  );
}
