import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list boards, stages and cards
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'all';
    const boardId = searchParams.get('board_id');

    if (action === 'boards') {
      const { data, error } = await supabase
        .from('kanban_boards')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'stages') {
      let query = supabase.from('kanban_stages').select('*').order('position', { ascending: true });
      if (boardId) query = (query as any).eq('board_id', boardId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'cards') {
      let query = supabase.from('kanban_cards').select('*').order('position', { ascending: true });
      if (boardId) query = (query as any).eq('board_id', boardId);
      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'contacts') {
      const cardId = searchParams.get('card_id');
      if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 });
      const { data, error } = await supabase
        .from('cs_contacts')
        .select('*')
        .eq('card_id', cardId)
        .order('contact_date', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'colaboradores') {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, name, role, phone')
        .order('name', { ascending: true });
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (action === 'alerts') {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      // Cards with overdue next_contact_date
      const { data: overdue } = await supabase
        .from('kanban_cards')
        .select('*')
        .not('next_contact_date', 'is', null)
        .lte('next_contact_date', today)
        .order('next_contact_date', { ascending: true });
      // Cards due today
      const { data: dueToday } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('next_contact_date', today);
      return NextResponse.json({ overdue: overdue || [], dueToday: dueToday || [] });
    }

    // all — boards + stages + cards together
    const [boardsRes, stagesRes, cardsRes] = await Promise.all([
      supabase.from('kanban_boards').select('*').order('position', { ascending: true }),
      boardId
        ? supabase.from('kanban_stages').select('*').eq('board_id', boardId).order('position', { ascending: true })
        : supabase.from('kanban_stages').select('*').order('position', { ascending: true }),
      boardId
        ? supabase.from('kanban_cards').select('*').eq('board_id', boardId).order('position', { ascending: true })
        : supabase.from('kanban_cards').select('*').order('position', { ascending: true }),
    ]);
    if (boardsRes.error) throw boardsRes.error;
    if (stagesRes.error) throw stagesRes.error;
    if (cardsRes.error) throw cardsRes.error;
    return NextResponse.json({ boards: boardsRes.data, stages: stagesRes.data, cards: cardsRes.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create board, stage or card
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    if (type === 'board') {
      const { data: existing } = await supabase
        .from('kanban_boards')
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const { data: created, error } = await supabase
        .from('kanban_boards')
        .insert([{ ...data, position: data.position ?? nextPos, is_default: false }])
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: created });
    }

    if (type === 'stage') {
      const boardId = data.board_id;
      let q = supabase.from('kanban_stages').select('position').order('position', { ascending: false }).limit(1);
      if (boardId) q = (q as any).eq('board_id', boardId);
      const { data: existing } = await q;
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

    if (type === 'contact') {
      const { card_id, contact_date, contact_type, responsible, notes, next_contact_date } = data;
      const { data: created, error } = await supabase
        .from('cs_contacts')
        .insert([{ card_id, contact_date, contact_type, responsible, notes, next_contact_date }])
        .select()
        .single();
      if (error) throw error;
      // Also update card's next_contact_date if provided
      if (next_contact_date) {
        await supabase.from('kanban_cards').update({ next_contact_date, updated_at: new Date().toISOString() }).eq('id', card_id);
      }
      return NextResponse.json({ data: created });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update board, stage, card or bulk reorder
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, ...updates } = body;

    if (type === 'board') {
      const { data, error } = await supabase
        .from('kanban_boards')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data });
    }

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

    // Bulk reorder stages
    if (type === 'reorder_stages') {
      const { stages } = updates;
      await Promise.all(
        stages.map((s: { id: string; position: number }) =>
          supabase.from('kanban_stages').update({ position: s.position }).eq('id', s.id)
        )
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove board, stage or card
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const moveTo = searchParams.get('move_to');

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (type === 'board') {
      const { data: board } = await supabase.from('kanban_boards').select('is_default').eq('id', id).single();
      if (board?.is_default) return NextResponse.json({ error: 'Cannot delete the default board' }, { status: 400 });
      const { error } = await supabase.from('kanban_boards').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (type === 'stage') {
      if (moveTo) {
        await supabase.from('kanban_cards').update({ stage_id: moveTo }).eq('stage_id', id);
      }
      const { error } = await supabase.from('kanban_stages').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (type === 'card') {
      const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (type === 'contact') {
      const { error } = await supabase.from('cs_contacts').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
