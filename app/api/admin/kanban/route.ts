import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list stages and cards
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'all';

    if (action === 'stages') {
      const { data, error } = await supabase
        .from('kanban_stages')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'cards') {
      const { data, error } = await supabase
        .from('kanban_cards')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // all — stages + cards together
    const [stagesRes, cardsRes] = await Promise.all([
      supabase.from('kanban_stages').select('*').order('position', { ascending: true }),
      supabase.from('kanban_cards').select('*').order('position', { ascending: true }),
    ]);
    if (stagesRes.error) throw stagesRes.error;
    if (cardsRes.error) throw cardsRes.error;
    return NextResponse.json({ stages: stagesRes.data, cards: cardsRes.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create stage or card
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    if (type === 'stage') {
      // Get max position
      const { data: existing } = await supabase
        .from('kanban_stages')
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const { data: created, error } = await supabase
        .from('kanban_stages')
        .insert([{ ...data, position: data.position ?? nextPos }])
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: created });
    }

    if (type === 'card') {
      const { data: existing } = await supabase
        .from('kanban_cards')
        .select('position')
        .eq('stage_id', data.stage_id)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const { data: created, error } = await supabase
        .from('kanban_cards')
        .insert([{ ...data, position: data.position ?? nextPos }])
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: created });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update stage or card
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, ...updates } = body;

    if (type === 'stage') {
      const { data, error } = await supabase
        .from('kanban_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'card') {
      const { data, error } = await supabase
        .from('kanban_cards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Bulk reorder cards
    if (type === 'reorder') {
      // updates.cards = [{ id, stage_id, position }]
      const { cards } = updates;
      await Promise.all(
        cards.map((c: { id: string; stage_id: string; position: number }) =>
          supabase
            .from('kanban_cards')
            .update({ stage_id: c.stage_id, position: c.position, updated_at: new Date().toISOString() })
            .eq('id', c.id)
        )
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove stage or card
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (type === 'stage') {
      const { error } = await supabase.from('kanban_stages').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (type === 'card') {
      const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
