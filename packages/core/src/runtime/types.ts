import type { Scalar } from '../schema/primitives';
import type { CapabilityRegistry } from '../schema/registry';
import type { Profile, Proposal } from '../schema/configuration';
import type { PlannerTransport, ConversationTurn } from './assistant';
import type { StorageAdapter } from '../storage/profile-store';
import type { ActionBinding } from '../actions/runtime';
export interface RuntimeState {
  profile?: Profile;
  preview?: Profile;
  previewSurfaceId?: string;
  previewSurfaceIds?: string[];
  conversation?: ConversationTurn[];
  code?: string;
  proposal?: Proposal;
  busy: boolean;
  loading: boolean;
  message?: string;
  warnings: string[];
  canUndo: boolean;
}
export interface RuntimeOptions {
  registry: CapabilityRegistry;
  storage: StorageAdapter;
  scope: string;
  planner?: PlannerTransport;
  /** Client planning deadline, 1–300000 ms. Defaults to 30000. */
  plannerTimeoutMs?: number;
  plannerContext?: () => Record<string, Scalar>;
  createId?: () => string;
  actions?: Record<string, ActionBinding>;
  session?: unknown;
}
