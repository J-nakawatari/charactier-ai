import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3004';
    const { searchParams } = new URL(request.url);
    
    console.log('🔍 Admin token-usage proxy - params:', Object.fromEntries(searchParams));

    const response = await fetch(`${backendUrl}/api/admin/token-usage?${searchParams}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend error', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Admin token-usage proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}