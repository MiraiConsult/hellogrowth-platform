import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
  searchParams?: Record<string, string>;
}

/**
 * Redirect de /form/[id] para /f/[id]
 * Garante compatibilidade com links antigos enviados por WhatsApp
 */
export default function FormRedirectPage({ params, searchParams }: Props) {
  const query = searchParams && Object.keys(searchParams).length > 0
    ? '?' + new URLSearchParams(searchParams).toString()
    : '';
  redirect(`/f/${params.id}${query}`);
}
