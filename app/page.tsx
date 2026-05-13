import HomeTokenPage from '@/components/HomeTokenPage';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeTokenPage />
    </Suspense>
  );
}
