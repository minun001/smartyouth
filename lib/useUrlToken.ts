'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function readWindowToken() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('t');
}

export function useUrlToken() {
  const searchParams = useSearchParams();
  const searchParamToken = searchParams.get('t');
  const [windowToken, setWindowToken] = useState<string | null>(() => readWindowToken());

  useEffect(() => {
    setWindowToken(readWindowToken());
  }, [searchParamToken]);

  return searchParamToken ?? windowToken;
}
