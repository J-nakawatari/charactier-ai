'use client';

import { useDynamicViewportHeight } from '@/hooks/useDynamicViewportHeight';

interface DynamicViewportProviderProps {
  children: React.ReactNode;
}

export function DynamicViewportProvider({ children }: DynamicViewportProviderProps) {
  useDynamicViewportHeight();
  return <>{children}</>;
}