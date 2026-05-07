import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('client_niches')
    .select('*')
    .order('position', { ascending: true })
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ niches: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body?.name || '').trim();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const slug = slugify(name);
  const hasClinicFields = Boolean(body?.has_clinic_fields);

  const { data, error } = await supabaseAdmin
    .from('client_niches')
    .insert({ name, slug, has_clinic_fields: hasClinicFields, position: 50 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('client_niches')
        .select('*')
        .eq('slug', slug)
        .single();
      return NextResponse.json({ niche: existing });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ niche: data });
}
