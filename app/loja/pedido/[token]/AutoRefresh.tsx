'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Enquanto o pagamento não é confirmado, atualiza a página sozinha a cada 15 s
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
