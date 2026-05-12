import BoothPageClient from '@/components/BoothPageClient';
import { booths } from '@/lib/booths';
import { Suspense } from 'react';

type BoothPageProps = {
  params: Promise<{ boothNo: string }>;
};

export default async function BoothPage({ params }: BoothPageProps) {
  const { boothNo } = await params;
  return (
    <Suspense fallback={null}>
      <BoothPageClient boothNo={Number(boothNo)} />
    </Suspense>
  );
}

export function generateStaticParams() {
  return booths.map((booth) => ({ boothNo: String(booth.boothNo) }));
}
