import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('client_contacts')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, name, email, phone, notes, isPrimary } = body;
  if (!userId || !name?.trim()) {
    return NextResponse.json({ error: 'userId and name required' }, { status: 400 });
  }

  if (isPrimary) {
    await supabaseAdmin
      .from('client_contacts')
      .update({ is_primary: false })
      .eq('user_id', userId);
  }

  const { data, error } = await supabaseAdmin
    .from('client_contacts')
    .insert({
      user_id: userId,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      is_primary: Boolean(isPrimary),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, userId, name, email, phone, notes, isPrimary } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (isPrimary && userId) {
    await supabaseAdmin
      .from('client_contacts')
      .update({ is_primary: false })
      .eq('user_id', userId);
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name?.trim() || null;
  if (email !== undefined) updates.email = email?.trim() || null;
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (notes !== undefined) updates.notes = notes?.trim() || null;
  if (isPrimary !== undefined) updates.is_primary = Boolean(isPrimary);

  const { data, error } = await supabaseAdmin
    .from('client_contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('client_contacts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
