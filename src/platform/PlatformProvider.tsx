import { useMemo, type ReactNode } from 'react';
import { PlatformContext } from '@/platform/PlatformContext';
import { createWebAdapter } from '@/platform/adapters/WebAdapter';
import type { PlatformContext as PlatformContextType } from '@/platform/types';

interface PlatformProviderProps {
  children: ReactNode;
}

function createAdapter(): PlatformContextType {
  return createWebAdapter();
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  // Create adapter once on mount
  // Using useMemo to ensure stable reference
  const platformContext = useMemo(() => createAdapter(), []);

  return <PlatformContext.Provider value={platformContext}>{children}</PlatformContext.Provider>;
}

// Re-export types for convenience
export type { PlatformContextType as PlatformContext };
