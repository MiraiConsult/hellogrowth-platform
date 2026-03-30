import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { surveyUrl, logoBase64, companyName } = body as {
      surveyUrl: string;
      logoBase64?: string;
      companyName?: string;
    };

    if (!surveyUrl) {
      return NextResponse.json({ error: 'surveyUrl é obrigatório' }, { status: 400 });
    }

    // 1. Gerar QR Code como data URL
    const qrDataUrl = await QRCode.toDataURL(surveyUrl, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    // 2. Montar HTML do card
    const logoSection = logoBase64
      ? `<div class="logo-area"><img src="${logoBase64}" alt="Logo" class="logo-img" /></div>`
      : companyName
      ? `<div class="logo-area"><p class="company-name">${companyName}</p></div>`
      : `<div class="logo-area"></div>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 620px;
    height: 877px;
    background: #1a5c2a;
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }

  /* Círculos decorativos */
  .circle {
    position: absolute;
    border-radius: 50%;
  }
  .c1 { width: 200px; height: 200px; background: #a8e063; opacity: 0.85; top: 80px; left: -80px; }
  .c2 { width: 100px; height: 100px; background: #2d8a4e; opacity: 0.9; top: 180px; left: -20px; }
  .c3 { width: 140px; height: 140px; background: #a8e063; opacity: 0.7; top: 60px; right: -50px; }
  .c4 { width: 190px; height: 190px; background: #a8e063; opacity: 0.75; bottom: 160px; right: -60px; }
  .c5 { width: 80px; height: 80px; background: #2d8a4e; opacity: 0.9; bottom: 220px; right: 10px; }
  .wave {
    position: absolute;
    bottom: 0;
    left: -10%;
    width: 120%;
    height: 160px;
    background: #c8f07a;
    opacity: 0.45;
    border-radius: 50% 50% 0 0 / 80px 80px 0 0;
  }

  /* Card branco */
  .card {
    position: relative;
    z-index: 10;
    background: #ffffff;
    border-radius: 36px;
    width: 460px;
    margin: 36px auto 0;
    padding: 28px 32px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    box-shadow: 0 12px 48px rgba(0,0,0,0.18);
  }

  /* Área da logo */
  .logo-area {
    width: 100%;
    height: 110px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .logo-img {
    max-width: 280px;
    max-height: 100px;
    object-fit: contain;
  }
  .company-name {
    font-size: 28px;
    font-weight: 800;
    color: #1a5c2a;
    text-align: center;
  }

  /* Divisor */
  .divider {
    width: 100%;
    height: 1px;
    background: #e5e7eb;
    margin-bottom: 20px;
  }

  /* Título */
  .title {
    font-size: 26px;
    font-weight: 900;
    color: #1a5c2a;
    text-align: center;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  /* Subtítulo */
  .subtitle {
    font-size: 15px;
    color: #444444;
    text-align: center;
    line-height: 1.5;
    margin-bottom: 20px;
  }
  .subtitle strong {
    font-weight: 700;
  }

  /* QR Code */
  .qr-wrap {
    background: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 16px;
    padding: 12px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }
  .qr-wrap img {
    width: 200px;
    height: 200px;
    display: block;
  }

  /* Estrelas */
  .stars {
    font-size: 32px;
    color: #F5C518;
    letter-spacing: 4px;
    margin-bottom: 4px;
  }

  /* Rodapé */
  .footer {
    position: relative;
    z-index: 10;
    text-align: center;
    padding-bottom: 28px;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .footer .hello { color: #a8e063; }
  .footer .growth { color: #ffffff; }
</style>
</head>
<body>
  <!-- Círculos decorativos -->
  <div class="circle c1"></div>
  <div class="circle c2"></div>
  <div class="circle c3"></div>
  <div class="circle c4"></div>
  <div class="circle c5"></div>
  <div class="wave"></div>

  <!-- Card branco -->
  <div class="card">
    ${logoSection}
    <div class="divider"></div>
    <p class="title">Faça sua avaliação</p>
    <p class="subtitle">Escaneie o QR code com<br/><strong>a câmera do seu celular</strong></p>
    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="QR Code" />
    </div>
    <div class="stars">★★★★★</div>
  </div>

  <!-- Rodapé -->
  <div class="footer">
    <span class="hello">Hello</span><span class="growth">Growth</span>
  </div>
</body>
</html>`;

    // 3. Renderizar com Puppeteer
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.default.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 620, height: 877, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Aguardar fontes carregarem
    await page.evaluate(() => document.fonts.ready);

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 620, height: 877 },
      omitBackground: false,
    });

    await browser.close();

    return new NextResponse(screenshot as Buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="card-avaliacao.png"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[generate-card] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
