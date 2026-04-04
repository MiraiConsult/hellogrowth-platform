import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/generate-report — gera um PDF de relatório de uso do cliente
export async function POST(request: NextRequest) {
  try {
    const { content, clientName, healthScore } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : healthScore >= 40 ? '#f97316' : '#ef4444';
    const scoreLabel = healthScore >= 80 ? 'Saudável' : healthScore >= 60 ? 'Atenção' : healthScore >= 40 ? 'Risco' : 'Crítico';
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    // Convert plain text to HTML paragraphs
    const htmlContent = content
      .split('\n')
      .map((line: string) => {
        if (!line.trim()) return '<br/>';
        if (line.startsWith('📊') || line.startsWith('📈') || line.startsWith('📌') || line.startsWith('📋') || line.startsWith('📣') || line.startsWith('📝')) {
          return `<p style="font-weight:700;color:#1e293b;margin:16px 0 8px;font-size:14px;">${line}</p>`;
        }
        if (line.startsWith('•') || line.startsWith('✅') || line.startsWith('⚠️')) {
          return `<p style="margin:4px 0 4px 16px;font-size:13px;color:#374151;">${line}</p>`;
        }
        return `<p style="margin:6px 0;font-size:13px;color:#374151;">${line}</p>`;
      })
      .join('');

    const scoreBarWidth = Math.min(100, Math.max(0, healthScore || 0));

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1e293b; }
    .page { padding: 48px 56px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
    .logo { font-size: 22px; font-weight: 800; color: #16a34a; letter-spacing: -0.5px; }
    .logo span { color: #1e293b; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 28px; }
    .score-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; }
    .score-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .score-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .score-value { font-size: 28px; font-weight: 800; color: ${scoreColor}; }
    .score-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${scoreColor}22; color: ${scoreColor}; }
    .score-bar-bg { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .score-bar-fill { height: 8px; border-radius: 4px; background: ${scoreColor}; width: ${scoreBarWidth}%; }
    .content { line-height: 1.7; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">Hello<span>Growth</span></div>
      <div class="meta">
        <div>Relatório de Uso</div>
        <div>${dateStr}</div>
      </div>
    </div>
    <div class="title">Relatório de Uso — ${clientName || 'Cliente'}</div>
    <div class="subtitle">Análise de engajamento e uso da plataforma HelloGrowth</div>
    <div class="score-card">
      <div class="score-header">
        <span class="score-label">Health Score</span>
        <span class="score-badge">${scoreLabel}</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:10px;">
        <span class="score-value">${healthScore || 0}</span>
        <span style="font-size:16px;color:#94a3b8;font-weight:400;">/100</span>
      </div>
      <div class="score-bar-bg"><div class="score-bar-fill"></div></div>
    </div>
    <div class="content">${htmlContent}</div>
    <div class="footer">
      HelloGrowth &mdash; Plataforma de Crescimento &bull; Gerado automaticamente em ${dateStr}
    </div>
  </div>
</body>
</html>`;

    // Use Puppeteer or a simple HTML-to-PDF approach
    // Since we can't use puppeteer in edge runtime, we'll return the HTML for client-side printing
    // Instead, we return the HTML with print styles so the browser can save as PDF
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="relatorio-${(clientName || 'cliente').replace(/\s+/g, '-').toLowerCase()}.html"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
