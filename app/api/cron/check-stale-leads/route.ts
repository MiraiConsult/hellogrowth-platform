import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

// Alerta de Lead Parado desativado — removido das opções de alertas
export async function GET(_request: NextRequest) {
  return NextResponse.json({ message: 'Alerta de lead parado desativado', sent: 0 });
}
