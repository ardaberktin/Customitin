import {
  applyProposal,
  configurationSchema,
  createProfile,
  invariant,
  makeProposal,
  plannerResponseSchema,
  validatePlanningTarget,
  type CapabilityRegistry,
  type Operation,
  type PlannerRequest,
  type PlannerResponse,
  type Profile,
  type Proposal,
} from '@customitin/core';
import { abortable, QueryScheduler } from './cancellation';
import { ProfileStore, type StorageAdapter } from '../storage/profile-store';

export interface PlannerTransport {
  plan(request: PlannerRequest, signal: AbortSignal): Promise<PlannerResponse>;
}
export interface RuntimeState {
  profile?: Profile;
  preview?: Profile;
  previewSurfaceId?: string;
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
  createId?: () => string;
}
let sequence = 0;
const localId = () =>
  `local-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export class CustomizationRuntime {
  readonly registry: CapabilityRegistry;
  readonly queries: QueryScheduler;
  private scope: string;
  private store: ProfileStore;
  private state: RuntimeState = {
    busy: false,
    loading: true,
    warnings: [],
    canUndo: false,
  };
  private listeners = new Set<() => void>();
  private epoch = 0;
  private controller = new AbortController();
  private pendingPlan?: AbortController;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private createId: () => string;
  constructor(private options: RuntimeOptions) {
    this.registry = options.registry;
    this.queries = new QueryScheduler(options.registry.limits.sources);
    this.scope = options.scope;
    this.store = new ProfileStore(
      options.storage,
      options.registry,
      options.scope,
    );
    this.createId = options.createId ?? localId;
  }
  getSnapshot = (): RuntimeState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  get signal(): AbortSignal {
    return this.controller.signal;
  }
  get activeScope(): string {
    return this.scope;
  }
  private publish(patch: Partial<RuntimeState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
  async start(): Promise<void> {
    if (this.controller.signal.aborted) this.controller = new AbortController();
    const epoch = this.epoch;
    try {
      const { record, warnings } = await this.store.load();
      if (epoch === this.epoch)
        this.publish({
          profile: record.current,
          warnings,
          loading: false,
          canUndo: record.history.length > 0,
        });
    } catch {
      if (epoch === this.epoch)
        this.publish({
          loading: false,
          message:
            'Your saved space is unavailable. Retry when storage is available.',
        });
    }
  }
  async switchScope(scope: string): Promise<void> {
    this.dispose();
    this.scope = scope;
    this.controller = new AbortController();
    this.store = new ProfileStore(this.options.storage, this.registry, scope);
    this.state = { busy: false, loading: true, warnings: [], canUndo: false };
    this.listeners.forEach((l) => l());
    await this.start();
  }
  dispose(): void {
    this.epoch++;
    this.controller.abort();
    this.pendingPlan?.abort();
  }
  cancelPreview(): void {
    this.pendingPlan?.abort();
    this.publish({
      proposal: undefined,
      preview: undefined,
      previewSurfaceId: undefined,
      busy: false,
      message: undefined,
    });
  }
  previewOperations(
    operations: Operation[],
    summary: string,
    surfaceId?: string,
  ): void {
    const current = this.state.profile;
    invariant(current, 'Your space is still loading');
    validatePlanningTarget(this.registry, surfaceId, operations);
    this.pendingPlan?.abort();
    const proposal = makeProposal(
      current,
      operations,
      this.createId(),
      summary,
    );
    this.publish({
      preview: applyProposal(current, proposal, this.registry),
      previewSurfaceId: surfaceId,
      proposal,
      message: undefined,
      busy: false,
    });
  }
  async request(instruction: string, surfaceId?: string): Promise<void> {
    const current = this.state.profile;
    invariant(current, 'Your space is still loading');
    validatePlanningTarget(this.registry, surfaceId);
    if (!this.options.planner) {
      this.publish({
        message:
          'The assistant is unavailable. You can still change appearance manually.',
      });
      return;
    }
    this.pendingPlan?.abort();
    const controller = new AbortController();
    this.pendingPlan = controller;
    const abort = () => controller.abort();
    this.signal.addEventListener('abort', abort, { once: true });
    const deadline = setTimeout(abort, 30_000);
    const epoch = this.epoch;
    const requestId = this.createId();
    this.publish({
      busy: true,
      message: undefined,
      preview: undefined,
      previewSurfaceId: undefined,
      proposal: undefined,
    });
    try {
      const response = plannerResponseSchema.parse(
        await abortable(
          this.options.planner.plan(
            {
              appId: this.registry.appId,
              requestId,
              registryRevision: this.registry.revision,
              baseRevision: current.revision,
              instruction,
              ...(surfaceId ? { surfaceId } : {}),
              configuration: configurationSchema.parse({
                theme: current.theme,
                views: current.views,
                surfaces: current.surfaces,
                navigation: current.navigation,
              }),
            },
            controller.signal,
          ),
          controller.signal,
        ),
      );
      if (epoch !== this.epoch || controller.signal.aborted) return;
      if (response.kind !== 'proposal') {
        this.publish({ message: response.message });
        return;
      }
      invariant(
        response.proposal.requestId === requestId,
        'The response belongs to an earlier request',
      );
      const profile = this.state.profile;
      invariant(profile, 'Your space is still loading');
      validatePlanningTarget(
        this.registry,
        surfaceId,
        response.proposal.operations,
      );
      const preview = applyProposal(profile, response.proposal, this.registry);
      this.publish({
        proposal: response.proposal,
        preview,
        previewSurfaceId: surfaceId,
      });
    } catch {
      if (epoch === this.epoch && this.pendingPlan === controller)
        this.publish({
          message:
            'That change could not be prepared. Your current space is unchanged. Try again.',
        });
    } finally {
      clearTimeout(deadline);
      this.signal.removeEventListener('abort', abort);
      if (epoch === this.epoch && this.pendingPlan === controller)
        this.publish({ busy: false });
    }
  }
  private mutate(change: Parameters<ProfileStore['update']>[0]): Promise<void> {
    const epoch = this.epoch;
    const store = this.store;
    const task = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        invariant(epoch === this.epoch, 'Your active profile changed');
        const record = await store.update(change);
        if (epoch === this.epoch)
          this.publish({
            profile: record.current,
            preview: undefined,
            previewSurfaceId: undefined,
            proposal: undefined,
            message: undefined,
            canUndo: record.history.length > 0,
          });
      });
    this.writeQueue = task;
    return task;
  }
  apply(): Promise<void> {
    const proposal = this.state.proposal;
    invariant(proposal, 'Preview a change first');
    return this.mutate((record) => ({
      current: applyProposal(
        record.current,
        proposal,
        this.registry,
        this.createId,
      ),
      history: [...record.history, record.current].slice(-20),
    }));
  }
  undo(): Promise<void> {
    return this.mutate((record) => {
      const previous = record.history.at(-1);
      invariant(previous, 'There are no changes to undo');
      return {
        current: { ...previous, revision: record.current.revision + 1 },
        history: record.history.slice(0, -1),
      };
    });
  }
  reset(): Promise<void> {
    return this.mutate((record) => ({
      current: {
        ...createProfile(this.registry, this.scope),
        revision: record.current.revision + 1,
      },
      history: [...record.history, record.current].slice(-20),
    }));
  }
  rename(name: string): Promise<void> {
    return this.mutate((record) => ({
      current: {
        ...record.current,
        name: name.trim(),
        revision: record.current.revision + 1,
      },
      history: [...record.history, record.current].slice(-20),
    }));
  }
}
