import { NextRequest } from 'next/server';
import { createAuthenticatedApiProxy } from '@/lib/api-proxy';

export async function GET(request: NextRequest) {
  return createAuthenticatedApiProxy('/api/notifications/stream', request);
}