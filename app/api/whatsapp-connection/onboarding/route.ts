import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateApiKey, getChannelInfo, setWebhookUrl } from '@/lib/360dialog-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST - Processar callback do onboarding do 360dialog
 * 
 * Após o cliente completar o Embedded Signup:
 * 1. Gera a API Key para o canal
 * 2. Busca informações do canal (número, nome, quality rating)
 * 3. Configura o webhook URL
 * 4. Salva a conexão no banco
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, clientId, channelId } = body;

    if (!tenantId || !channelId) {
      return NextResponse.json(
        { error: 'tenantId e channelId são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Gerar API Key para o canal
    const apiKeyResult = await generateApiKey(channelId);
    if (!apiKeyResult) {
      return NextResponse.json(
        { error: 'Não foi possível gerar a API Key. Verifique as permissões do partner.' },
        { status: 500 }
      );
    }

    // 2. Buscar informações do canal
    const channelInfo = await getChannelInfo(channelId);
    
    // 3. Configurar webhook URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const webhookUrl = `${appUrl}/api/whatsapp/webhook`;
    await setWebhookUrl(channelId, webhookUrl);

    // 4. Salvar conexão no banco
    const connectionData = {
      tenant_id: tenantId,
      provider: '360dialog',
      channel_id: channelId,
      client_id: clientId || null,
      api_key: apiKeyResult.apiKey,
      phone_number: channelInfo?.phone_number || '',
      display_name: channelInfo?.display_name || channelInfo?.verified_name || '',
      quality_rating: channelInfo?.quality_rating || 'UNKNOWN',
      status: 'active',
      waba_id: channelInfo?.waba_id || '',
      connected_at: new Date().toISOString(),
    };

    // Desativar conexões anteriores do mesmo tenant
    await supabase
      .from('whatsapp_connections')
      .update({ status: 'inactive' })
      .eq('tenant_id', tenantId)
      .eq('provider', '360dialog');

    // Inserir nova conexão
    const { data, error } = await supabase
      .from('whatsapp_connections')
      .insert(connectionData)
      .select()
      .single();

    if (error) {
      console.error('[onboarding] Erro ao salvar conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      connection: data,
      message: 'WhatsApp conectado com sucesso!'
    });

  } catch (error: any) {
    console.error('[onboarding] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
