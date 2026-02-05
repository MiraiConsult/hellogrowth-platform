// Edge Function para enviar email de convite para membros da equipe
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { to, name, inviterName, role, inviteLink } = await req.json()

    if (!to || !name || !inviteLink) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Mapear roles para português
    const roleLabels: Record<string, string> = {
      manager: 'Gerente',
      member: 'Membro',
      viewer: 'Visualizador'
    }

    const roleLabel = roleLabels[role] || role

    // Gerar senha temporária
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()

    // Template do email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
    .credentials { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Você foi convidado!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${name}</strong>,</p>
      
      <p><strong>${inviterName}</strong> convidou você para fazer parte da equipe no <strong>HelloGrowth</strong> como <strong>${roleLabel}</strong>.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0; color: #667eea;">🔐 Suas Credenciais de Acesso</h3>
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Senha Temporária:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
        <p style="color: #dc2626; font-size: 14px;"><strong>⚠️ Importante:</strong> Altere sua senha no primeiro login!</p>
      </div>
      
      <p style="text-align: center;">
        <a href="${inviteLink}" class="button">Aceitar Convite e Fazer Login</a>
      </p>
      
      <p style="font-size: 14px; color: #666;">Este convite expira em 7 dias.</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="font-size: 14px; color: #666;">
        Se você não esperava este convite, pode ignorar este email com segurança.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HelloGrowth. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
    `

    // Enviar email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'HelloGrowth <noreply@hellogrowth.online>',
        to: [to],
        subject: `🎉 Você foi convidado para o HelloGrowth como ${roleLabel}`,
        html: emailHtml
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    // Salvar senha temporária no Supabase Auth
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Criar usuário no Supabase Auth com senha temporária
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: to,
      password: tempPassword,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        name: name,
        role: role,
        invited_by: inviterName,
        must_change_password: true
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data.id,
        tempPassword: tempPassword // Retornar para log (remover em produção)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
