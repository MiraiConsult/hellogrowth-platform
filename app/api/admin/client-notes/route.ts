import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/client-notes?userId=xxx
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('client_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data })
}

// POST /api/admin/client-notes
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, adminId, adminName, content, type = 'note' } = body

  if (!userId || !content || !adminName) {
    return NextResponse.json({ error: 'userId, content and adminName required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('client_notes')
    .insert({ user_id: userId, admin_id: adminId || 'admin', admin_name: adminName, content, type })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}

// DELETE /api/admin/client-notes?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_notes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH /api/admin/client-notes
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, content } = body
  if (!id || !content) return NextResponse.json({ error: 'id and content required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('client_notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
