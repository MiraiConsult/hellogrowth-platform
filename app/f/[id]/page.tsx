import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import FormRedirect from './FormRedirect';

async function getFormName(id: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('forms')
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
  const name = await getFormName(params.id);
  const title = name ? `${name} — HelloGrowth` : 'Formulário — HelloGrowth';
  const description = name
    ? `Preencha o formulário "${name}" e entre em contato conosco.`
    : 'Preencha nosso formulário e entraremos em contato.';

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
          url: 'https://www.hellogrowth.online/og-form.png',
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

export default function FormPage({ params }: { params: { id: string } }) {
  return <FormRedirect id={params.id} />;
}
