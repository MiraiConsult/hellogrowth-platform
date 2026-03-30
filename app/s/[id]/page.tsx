import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import SurveyRedirect from './SurveyRedirect';

async function getSurveyName(id: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('campaigns')
      .select('name')
      .eq('id', id)
      .single();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const name = await getSurveyName(params.id);
  const title = name ? `${name} — HelloGrowth` : 'Pesquisa de Satisfação — HelloGrowth';
  const description = name
    ? `Responda a pesquisa "${name}" e nos ajude a melhorar nosso atendimento.`
    : 'Responda nossa pesquisa de satisfação e nos ajude a melhorar.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'HelloGrowth',
      images: [
        {
          url: 'https://www.hellogrowth.online/og-survey.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function SurveyPage({ params }: { params: { id: string } }) {
  return <SurveyRedirect id={params.id} />;
}
