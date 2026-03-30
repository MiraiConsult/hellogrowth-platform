import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const userEmail = email.toLowerCase().trim();

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .maybeSingle();

    return NextResponse.json({ 
      exists: !!existingUser 
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
