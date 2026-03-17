import { Suspense } from 'react';
import PricingClient from './PricingClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando planos...</p>
      </div>
    </div>
  );
}

export default function PricingPage({ searchParams }: PageProps) {
  // Check if user canceled checkout
  const canceled = searchParams.canceled === 'true';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PricingClient showCanceledMessage={canceled} />
    </Suspense>
  );
}
