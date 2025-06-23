import { NextResponse, NextRequest } from 'next/server';
import { BackendClient } from '@/utils/backend-client';

export async function GET(request: NextRequest) {
  try {
    const backendClient = new BackendClient();
    const response = await backendClient.proxyRequest(request, '/api/debug/auth-test');
    
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({
        error: `Backend error: ${response.status}`,
        details: text
      }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Debug auth-test error:', error);
    return NextResponse.json({
      error: error.message,
      authenticated: false,
      user: null
    }, { status: 500 });
  }
}