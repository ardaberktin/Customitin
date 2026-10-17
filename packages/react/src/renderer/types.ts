import type { ReactNode } from 'react';
export interface SurfaceStatus {
  code: string;
  surfaceId: string;
  nodeId?: string;
}
export type StatusRenderer = (status: SurfaceStatus) => ReactNode;
