import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Deletar conexão Gmail do usuário
    const { error } = await supabase
      .from('gmail_connections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting Gmail:', error);
      return NextResponse.json(
        { error: 'Erro ao desconectar Gmail' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail desconectado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error in disconnect route:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao desconectar Gmail' },
      { status: 500 }
    );
  }
}
