import { NextRequest } from 'next/server';
import { createApiProxy } from '@/utils/apiProxy';

export async function POST(request: NextRequest) {
  return createApiProxy('/api/auth/login', request);
}