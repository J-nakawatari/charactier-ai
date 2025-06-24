import { NextRequest } from 'next/server';
import { createAuthenticatedApiProxy } from '@/utils/apiProxy';

export async function GET(request: NextRequest) {
  return createAuthenticatedApiProxy('/api/user/profile', request);
}