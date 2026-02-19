'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CanceledPage() {
  const router = useRouter();

  useEffect(() => {
    // Store canceled flag in sessionStorage so PricingClient can read it
    sessionStorage.setItem('checkout_canceled', 'true');
    // Redirect to pricing page
    router.replace('/pricing');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}
