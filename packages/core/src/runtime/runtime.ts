import { applyProposal, makeProposal } from '../patches/apply';
import { createProfile } from '../validation/profile';
import { validatePlanningTarget } from '../validation/planning';
import { invariant } from '../schema/primitives';
import type { CapabilityRegistry } from '../schema/registry';
import type { Operation } from '../schema/configuration';
import { undoRecord } from './history';
import type { RuntimeOptions, RuntimeState } from './types';
export type { RuntimeOptions, RuntimeState } from './types';
import { QueryScheduler } from './cancellation';
import { AssistantController } from './assistant';
import { ActionRuntime } from '../actions/runtime';
import { ProfileStore } from '../storage/profile-store';

export type { PlannerTransport } from './assistant';
let sequence = 0;
const localId = () =>
  `local-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export class CustomizationRuntime {
  readonly registry: CapabilityRegistry;
  readonly queries: QueryScheduler;
  readonly actions: ActionRuntime;
  readonly assistant: AssistantController;
  private invalidations = new Set<(ids: string[]) => void>();
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
  private pendingWrites = 0;
  private writeQueue: Promise<unknown> = Promise.resolve();
  private createId: () => string;
  constructor(private options: RuntimeOptions) {
    createProfile(options.registry, options.scope);
    this.registry = options.registry;
    this.queries = new QueryScheduler(options.registry.limits.sources);
    this.scope = options.scope;
    this.store = new ProfileStore(
      options.storage,
      options.registry,
      options.scope,
    );
    this.createId = options.createId ?? localId;
    this.actions = new ActionRuntime({
      registry: options.registry,
      bindings: options.actions ?? {},
      context: () => ({
        scope: this.scope,
        revision: this.state.profile?.revision ?? -1,
        preview: !!this.state.preview || this.pendingWrites > 0,
        signal: this.signal,
        session: options.session,
      }),
      invalidate: (ids) => this.invalidate(ids),
    });
    this.assistant = new AssistantController({
      registry: options.registry,
      transport: options.planner,
      timeoutMs: options.plannerTimeoutMs,
      permittedContext: options.plannerContext,
      snapshot: this.getSnapshot,
      signal: () => this.signal,
      publish: (patch) => this.publish(patch),
      createId: this.createId,
      action: (proposal) => this.actions.propose(proposal),
      canPlan: () => !this.actions.isPending && this.pendingWrites === 0,
    });
  }
  getSnapshot = (): RuntimeState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  subscribeInvalidation = (listener: (ids: string[]) => void) => {
    this.invalidations.add(listener);
    return () => {
      this.invalidations.delete(listener);
    };
  };
  invalidate(ids: string[]) {
    this.invalidations.forEach((listener) => listener(ids));
  }
  allocateId = () => this.createId();
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
    this.assistant.clear();
    this.actions.dispose();
  }
  cancelPreview(): void {
    this.assistant.cancel();
    this.publish({
      proposal: undefined,
      preview: undefined,
      previewSurfaceId: undefined,
      previewSurfaceIds: undefined,
      busy: false,
      message: undefined,
    });
  }
  previewOperations(
    operations: Operation[],
    summary: string,
    surfaceId?: string | string[],
  ): void {
    invariant(
      !this.actions.isPending && this.pendingWrites === 0,
      'Finish the current operation before previewing',
    );
    const current = this.state.profile;
    invariant(current, 'Your space is still loading');
    validatePlanningTarget(this.registry, surfaceId, operations, current);
    this.assistant.cancel();
    const proposal = makeProposal(
      current,
      operations,
      this.createId(),
      summary,
    );
    this.publish({
      preview: applyProposal(current, proposal, this.registry),
      previewSurfaceId: typeof surfaceId === 'string' ? surfaceId : undefined,
      previewSurfaceIds:
        typeof surfaceId === 'string' ? [surfaceId] : surfaceId,
      proposal,
      message: undefined,
      busy: false,
    });
  }
  request(instruction: string, target?: string | string[]): Promise<void> {
    return this.assistant.request(instruction, target);
  }
  private mutate(change: Parameters<ProfileStore['update']>[0]): Promise<void> {
    invariant(
      !this.actions.isPending,
      'Finish the action before changing layouts',
    );
    this.pendingWrites++;
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
            previewSurfaceIds: undefined,
            proposal: undefined,
            message: undefined,
            canUndo: record.history.length > 0,
          });
      });
    const settled = task.finally(() => {
      this.pendingWrites--;
    });
    this.writeQueue = settled;
    return settled;
  }
  apply(): Promise<void> {
    const proposal = this.state.proposal;
    invariant(proposal, 'Preview a change first');
    validatePlanningTarget(
      this.registry,
      this.state.previewSurfaceIds,
      proposal.operations,
      this.state.profile,
    );
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
  undo(target?: string[]): Promise<void> {
    return this.mutate((record) => undoRecord(record, this.registry, target));
  }
  reset(target?: string[]): Promise<void> {
    if (target) {
      const operations: Operation[] = target.map((surfaceId) => ({
        op: 'setSurfaceLayout',
        surfaceId,
        nodes:
          this.registry.surfaces.find((surface) => surface.id === surfaceId)
            ?.defaultLayout ?? [],
      }));
      return this.mutate((record) => {
        validatePlanningTarget(
          this.registry,
          target,
          operations,
          record.current,
        );
        return {
          current: applyProposal(
            record.current,
            makeProposal(
              record.current,
              operations,
              this.createId(),
              'Restore layout',
            ),
            this.registry,
          ),
          history: [...record.history, record.current].slice(-20),
        };
      });
    }
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
