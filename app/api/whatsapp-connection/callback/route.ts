import { NextRequest, NextResponse } from 'next/server';

/**
 * GET - Callback do 360dialog Embedded Signup
 * 
 * Após o cliente completar o onboarding no popup da Meta,
 * o 360dialog redireciona para esta URL com os parâmetros:
 * - client: ID do cliente no 360dialog
 * - channels: array de channel IDs conectados
 * 
 * Esta rota retorna um HTML que envia os dados de volta para a janela pai (popup → parent)
 */
export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get('client') || '';
  const channels = req.nextUrl.searchParams.get('channels') || '[]';

  // Retornar HTML que comunica com a janela pai via postMessage
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Conectando WhatsApp...</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          background: #f9fafb;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #16a34a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        h2 { color: #111827; font-size: 1.25rem; margin-bottom: 0.5rem; }
        p { color: #6b7280; font-size: 0.875rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h2>WhatsApp conectado!</h2>
        <p>Processando configuração... Esta janela será fechada automaticamente.</p>
      </div>
      <script>
        (function() {
          const data = {
            type: '360dialog-connect',
            client: '${client}',
            channels: ${channels}
          };
          
          // Enviar dados para a janela pai
          if (window.opener) {
            window.opener.postMessage(data, '*');
            setTimeout(() => window.close(), 2000);
          } else {
            // Se não tem opener (redirect direto), salvar no localStorage
            localStorage.setItem('360dialog-callback', JSON.stringify(data));
            window.location.href = '/';
          }
        })();
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
