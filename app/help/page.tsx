import HelpTokenPage from '@/components/HelpTokenPage';
import { Suspense } from 'react';

export default function HelpPage() {
  return (
    <Suspense fallback={null}>
      <HelpTokenPage />
    </Suspense>
  );
}
