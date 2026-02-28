import PricingClient from './PricingClient';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function PricingPage({ searchParams }: PageProps) {
  // Check if user canceled checkout
  const canceled = searchParams.canceled === 'true';

  return <PricingClient showCanceledMessage={canceled} />;
}
