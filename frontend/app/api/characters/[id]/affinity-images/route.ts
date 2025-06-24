import { NextRequest } from 'next/server';
import { createAuthenticatedApiProxy } from '@/utils/apiProxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return createAuthenticatedApiProxy(`/api/v1/characters/${id}/affinity-images`, request);
}