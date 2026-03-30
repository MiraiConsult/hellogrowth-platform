import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Dimensões do card (proporção A5 portrait, alta resolução para impressão)
const W = 1240;
const H = 1754;

// Cores do layout
const GREEN_DARK = '#1a5c2a';
const GREEN_MID = '#2d8a4e';
const GREEN_LIGHT = '#a8e063';
const GREEN_LIGHTER = '#c8f07a';
const WHITE = '#ffffff';
const YELLOW_STAR = '#F5C518';
const GRAY_TEXT = '#444444';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Gera um círculo SVG
function circle(cx: number, cy: number, r: number, fill: string, opacity = 1): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
}

// Gera estrelas em SVG
function stars(cx: number, cy: number, size: number, count: number): string {
  const starPath = (x: number, y: number, s: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? s : s * 0.4;
      pts.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${YELLOW_STAR}"/>`;
  };
  const gap = size * 2.4;
  const totalW = gap * (count - 1);
  let svg = '';
  for (let i = 0; i < count; i++) {
    svg += starPath(cx - totalW / 2 + i * gap, cy, size);
  }
  return svg;
}

// Texto SVG com quebra de linha simples
function text(
  content: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  fontWeight: string = 'normal',
  anchor: string = 'middle',
  letterSpacing: number = 0
): string {
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letterSpacing}">${content}</text>`;
}

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

    // 1. Gerar QR Code como PNG buffer
    const qrBuffer = await QRCode.toBuffer(surveyUrl, {
      errorCorrectionLevel: 'H',
      width: 500,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    // 2. Dimensões do card interno (com margem)
    const cardMarginX = 80;
    const cardMarginY = 60;
    const cardW = W - cardMarginX * 2;
    const cardH = H - cardMarginY * 2 - 120; // 120 para rodapé

    // 3. Posições dos elementos dentro do card
    const cardX = cardMarginX;
    const cardY = cardMarginY;
    const cardCX = W / 2;

    // Área da logo: topo do card, altura 220px
    const logoAreaH = 220;
    const logoAreaY = cardY + 40;

    // Título: abaixo da área da logo
    const titleY = cardY + logoAreaH + 80;

    // Subtítulo
    const subtitleY = titleY + 90;

    // QR Code: centralizado, 420x420
    const qrSize = 420;
    const qrX = cardCX - qrSize / 2;
    const qrY = subtitleY + 60;

    // Estrelas: abaixo do QR
    const starsY = qrY + qrSize + 80;

    // 4. Construir SVG base
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="cardClip">
      <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="60" ry="60"/>
    </clipPath>
  </defs>

  <!-- Fundo verde escuro -->
  <rect width="${W}" height="${H}" fill="${GREEN_DARK}"/>

  <!-- Mancha verde clara no rodapé (fora do card) -->
  <ellipse cx="${W / 2}" cy="${H - 40}" rx="${W * 0.7}" ry="180" fill="${GREEN_LIGHTER}" opacity="0.5"/>

  <!-- Círculos decorativos externos -->
  ${circle(-60, 260, 200, GREEN_LIGHT, 0.85)}
  ${circle(-30, 380, 110, GREEN_MID, 0.9)}
  ${circle(W + 50, 320, 160, GREEN_LIGHT, 0.7)}
  ${circle(W + 20, H - 420, 200, GREEN_LIGHT, 0.75)}
  ${circle(W - 40, H - 300, 90, GREEN_MID, 0.9)}

  <!-- Card branco com bordas arredondadas -->
  <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="60" ry="60" fill="${WHITE}" filter="url(#shadow)"/>

  <!-- Sombra do card -->
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Linha divisória sutil abaixo da área da logo -->
  <line x1="${cardX + 80}" y1="${logoAreaY + logoAreaH + 20}" x2="${cardX + cardW - 80}" y2="${logoAreaY + logoAreaH + 20}" stroke="#e5e7eb" stroke-width="1.5"/>

  <!-- Título "FAÇA SUA AVALIAÇÃO" -->
  ${text('FAÇA SUA AVALIAÇÃO', cardCX, titleY, 62, GREEN_DARK, 'bold', 'middle', 2)}

  <!-- Subtítulo linha 1 -->
  ${text('Escaneie o QR code com', cardCX, subtitleY, 34, GRAY_TEXT, 'normal', 'middle')}
  <!-- Subtítulo linha 2 (bold) -->
  ${text('a câmera do seu celular', cardCX, subtitleY + 46, 34, GRAY_TEXT, 'bold', 'middle')}

  <!-- Placeholder QR Code (será substituído pelo composite) -->

  <!-- Estrelas -->
  ${stars(cardCX, starsY, 38, 5)}

  <!-- Rodapé HelloGrowth -->
  <text x="${cardCX}" y="${H - 55}" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="bold" text-anchor="middle">
    <tspan fill="${GREEN_LIGHT}">Hello</tspan><tspan fill="${WHITE}">Growth</tspan>
  </text>
</svg>`;

    // 5. Renderizar SVG base com sharp
    const svgBuffer = Buffer.from(svgContent);
    let baseImage = sharp(svgBuffer).png();

    // 6. Preparar composites
    const composites: sharp.OverlayOptions[] = [];

    // QR Code com borda branca
    const qrWithBorder = await sharp(qrBuffer)
      .resize(qrSize, qrSize)
      .extend({ top: 20, bottom: 20, left: 20, right: 20, background: WHITE })
      .png()
      .toBuffer();

    composites.push({
      input: qrWithBorder,
      left: Math.round(qrX - 20),
      top: Math.round(qrY),
    });

    // 7. Logo do cliente (se fornecida)
    if (logoBase64) {
      try {
        // Remove prefixo data:image/...;base64,
        const base64Data = logoBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        const logoBuffer = Buffer.from(base64Data, 'base64');

        // Redimensionar logo para caber na área (máx 400x160)
        const logoResized = await sharp(logoBuffer)
          .resize(400, 160, { fit: 'inside', withoutEnlargement: false })
          .png()
          .toBuffer();

        const logoMeta = await sharp(logoResized).metadata();
        const logoW = logoMeta.width || 400;
        const logoH = logoMeta.height || 160;

        // Centralizar na área da logo
        const logoLeft = Math.round(cardCX - logoW / 2);
        const logoTop = Math.round(logoAreaY + (logoAreaH - logoH) / 2);

        composites.push({
          input: logoResized,
          left: logoLeft,
          top: logoTop,
        });
      } catch {
        // Se a logo falhar, continua sem ela
      }
    } else if (companyName) {
      // Se não tem logo mas tem nome da empresa, renderizar como texto SVG
      const nameSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="100">
        <text x="300" y="70" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="bold" fill="${GREEN_DARK}" text-anchor="middle">${companyName}</text>
      </svg>`;
      const nameBuffer = await sharp(Buffer.from(nameSvg)).png().toBuffer();
      composites.push({
        input: nameBuffer,
        left: Math.round(cardCX - 300),
        top: Math.round(logoAreaY + 20),
      });
    }

    // 8. Aplicar composites e gerar PNG final
    const finalBuffer = await sharp(svgBuffer)
      .png()
      .composite(composites)
      .toBuffer();

    return new NextResponse(finalBuffer, {
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
