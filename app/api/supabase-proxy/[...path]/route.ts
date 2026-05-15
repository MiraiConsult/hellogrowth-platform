import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Proxy para Supabase — roteia todas as chamadas REST pelo servidor Vercel
 * para evitar ERR_CONNECTION_RESET em redes que bloqueiam *.supabase.co
 */
async function proxyRequest(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const url = new URL(request.url);
  const targetUrl = `${SUPABASE_URL}/${path}${url.search}`;

  // Forward all headers except host, connection and accept-encoding
  // Remove accept-encoding to get uncompressed response from Supabase
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && lower !== 'connection' && lower !== 'accept-encoding') {
      headers.set(key, value);
    }
  });
  // Request uncompressed response from Supabase
  headers.set('Accept-Encoding', 'identity');

  try {
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      // @ts-ignore
      duplex: 'half',
    };

    // Forward body for non-GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        fetchOptions.body = body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Build clean response headers — exclude encoding-related headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        lower !== 'transfer-encoding' &&
        lower !== 'connection' &&
        lower !== 'content-encoding' &&
        lower !== 'content-length'
      ) {
        responseHeaders.set(key, value);
      }
    });

    // Set correct content type
    const contentType = response.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    // 204 No Content responses must have no body
    if (response.status === 204 || response.status === 304) {
      return new NextResponse(null, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    // Read the response as text to ensure we have decoded content
    const responseText = await response.text();

    return new NextResponse(responseText, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Supabase Proxy] Error:', error.message);
    return NextResponse.json(
      { error: 'Proxy error', message: error.message },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
