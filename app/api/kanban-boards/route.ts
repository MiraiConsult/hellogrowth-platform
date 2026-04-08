import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEFAULT_STAGES = [
  { name: 'Novo', color: '#9CA3AF', emoji: '🆕', position: 0 },
  { name: 'Em Contato', color: '#3B82F6', emoji: '📞', position: 1 },
  { name: 'Negociação', color: '#A855F7', emoji: '🤝', position: 2 },
  { name: 'Vendido', color: '#22C55E', emoji: '✅', position: 3 },
  { name: 'Perdido', color: '#EF4444', emoji: '❌', position: 4 },
];

// GET — list boards (with their stages) for a tenant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');
    if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    // Fetch boards
    const { data: boards, error: boardsError } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true });

    if (boardsError) throw boardsError;

    // If no boards exist, create the default one
    if (!boards || boards.length === 0) {
      const { data: newBoard, error: createError } = await supabase
        .from('kanban_boards')
        .insert([{ tenant_id: tenantId, name: 'Funil Principal', is_default: true, position: 0 }])
        .select()
        .single();

      if (createError) throw createError;

      // Create default stages for the new board
      const stagesToInsert = DEFAULT_STAGES.map(s => ({
        ...s,
        board_id: newBoard.id,
        tenant_id: tenantId,
      }));
      await supabase.from('kanban_stages').insert(stagesToInsert);

      // Fetch the newly created stages
      const { data: newStages } = await supabase
        .from('kanban_stages')
        .select('*')
        .eq('board_id', newBoard.id)
        .order('position', { ascending: true });

      return NextResponse.json({ boards: [{ ...newBoard, stages: newStages || [] }] });
    }

    // Fetch stages for all boards
    const boardIds = boards.map(b => b.id);
    const { data: stages, error: stagesError } = await supabase
      .from('kanban_stages')
      .select('*')
      .in('board_id', boardIds)
      .order('position', { ascending: true });

    if (stagesError) throw stagesError;

    // Attach stages to their boards
    const boardsWithStages = boards.map(board => ({
      ...board,
      stages: (stages || []).filter(s => s.board_id === board.id),
    }));

    return NextResponse.json({ boards: boardsWithStages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — create a new board or a new stage
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...data } = body;

    if (type === 'board') {
      const { tenant_id, name, color } = data;
      if (!tenant_id || !name) return NextResponse.json({ error: 'tenant_id and name required' }, { status: 400 });

      // Get max position
      const { data: existing } = await supabase
        .from('kanban_boards')
        .select('position')
        .eq('tenant_id', tenant_id)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data: newBoard, error } = await supabase
        .from('kanban_boards')
        .insert([{ tenant_id, name, color: color || '#6366f1', position: nextPos, is_default: false }])
        .select()
        .single();

      if (error) throw error;

      // Create default stages for the new board
      const stagesToInsert = DEFAULT_STAGES.map(s => ({
        ...s,
        board_id: newBoard.id,
        tenant_id,
      }));
      await supabase.from('kanban_stages').insert(stagesToInsert);

      const { data: newStages } = await supabase
        .from('kanban_stages')
        .select('*')
        .eq('board_id', newBoard.id)
        .order('position', { ascending: true });

      return NextResponse.json({ board: { ...newBoard, stages: newStages || [] } });
    }

    if (type === 'stage') {
      const { board_id, tenant_id, name, color, emoji } = data;
      if (!board_id || !name) return NextResponse.json({ error: 'board_id and name required' }, { status: 400 });

      // Get max position in this board
      const { data: existing } = await supabase
        .from('kanban_stages')
        .select('position')
        .eq('board_id', board_id)
        .order('position', { ascending: false })
        .limit(1);
      const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { data: newStage, error } = await supabase
        .from('kanban_stages')
        .insert([{ board_id, tenant_id, name, color: color || '#6366f1', emoji: emoji || '📋', position: nextPos }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ stage: newStage });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — update a board or stage, or reorder stages
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
      return NextResponse.json({ board: data });
    }

    if (type === 'stage') {
      const { data, error } = await supabase
        .from('kanban_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ stage: data });
    }

    if (type === 'reorder_stages') {
      // updates.stages = [{ id, position }]
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

// DELETE — delete a board or stage
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const moveTo = searchParams.get('move_to'); // For stages: move leads to this stage before deleting

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (type === 'board') {
      // Get the board first to check if it's the only one
      const { data: board } = await supabase.from('kanban_boards').select('tenant_id').eq('id', id).single();
      if (!board) return NextResponse.json({ error: 'Board not found' }, { status: 404 });

      const { data: allBoards } = await supabase.from('kanban_boards').select('id').eq('tenant_id', board.tenant_id);
      if (!allBoards || allBoards.length <= 1) {
        return NextResponse.json({ error: 'Não é possível excluir o único fluxo.' }, { status: 400 });
      }

      const { error } = await supabase.from('kanban_boards').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (type === 'stage') {
      // Get the stage to check if it's the last one in the board
      const { data: stage } = await supabase.from('kanban_stages').select('board_id, name').eq('id', id).single();
      if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 });

      const { data: allStages } = await supabase.from('kanban_stages').select('id').eq('board_id', stage.board_id);
      if (!allStages || allStages.length <= 1) {
        return NextResponse.json({ error: 'Não é possível excluir a única etapa.' }, { status: 400 });
      }

      // Move leads from this stage to another stage (or first available)
      if (moveTo) {
        const { data: targetStage } = await supabase.from('kanban_stages').select('name').eq('id', moveTo).single();
        if (targetStage) {
          await supabase.from('leads').update({ status: targetStage.name }).eq('status', stage.name);
        }
      } else {
        // Move to first available stage
        const otherStage = allStages.find(s => s.id !== id);
        if (otherStage) {
          const { data: firstStage } = await supabase.from('kanban_stages').select('name').eq('id', otherStage.id).single();
          if (firstStage) {
            await supabase.from('leads').update({ status: firstStage.name }).eq('status', stage.name);
          }
        }
      }

      const { error } = await supabase.from('kanban_stages').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
