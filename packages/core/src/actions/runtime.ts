import type { CapabilityRegistry } from '../schema/registry';
import type { ActionProposal } from '../schema/data-plan';
import { invariant, throwIfAborted, type Scalar } from '../schema/primitives';
import type { QueryContext } from '../data/source';
import { validateValues } from '../validation/values';
import { validateActionProposal } from './validate';
import { abortable } from '../runtime/cancellation';

export interface ActionContext extends QueryContext {
  appId: string;
  proposal: ActionProposal;
  idempotencyKey: string;
}
export interface ActionBinding {
  available?(
    args: Record<string, Scalar>,
    context: QueryContext,
  ): boolean | Promise<boolean>;
  execute(
    args: Record<string, Scalar>,
    context: ActionContext,
  ): Promise<Record<string, Scalar>>;
}
export type ActionStatus =
  | 'idle'
  | 'proposed'
  | 'awaiting-confirmation'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';
export interface ActionState {
  status: ActionStatus;
  proposal?: ActionProposal;
  result?: Record<string, Scalar>;
  code?: string;
}
export type ActionConfirmation = (
  proposal: ActionProposal,
  signal: AbortSignal,
) => Promise<boolean>;
export interface ActionRuntimeOptions {
  registry: CapabilityRegistry;
  bindings: Record<string, ActionBinding>;
  context(): QueryContext & { revision: number; preview: boolean };
  invalidate(sourceIds: string[]): void;
}

export class ActionRuntime {
  private state: ActionState = { status: 'idle' };
  private listeners = new Set<() => void>();
  private used = new Set<string>();
  private controller?: AbortController;
  private scope?: string;
  constructor(private options: ActionRuntimeOptions) {}
  getSnapshot = () => this.state;
  get isPending() {
    return !!this.controller;
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(state: ActionState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  propose(input: ActionProposal) {
    const context = this.options.context();
    invariant(
      !context.preview,
      'Actions are unavailable during a layout preview',
    );
    invariant(!this.controller, 'An action is already pending');
    const { proposal } = validateActionProposal(
      input,
      this.options.registry,
      context.revision,
      [input.surfaceId],
    );
    invariant(
      !this.used.has(proposal.requestId),
      'This action was already submitted',
    );
    this.scope = context.scope;
    this.publish({ status: 'proposed', proposal });
  }
  cancel() {
    this.controller?.abort();
    this.publish({ status: 'cancelled' });
  }
  dispose() {
    this.cancel();
    this.used.clear();
  }
  async execute(confirm?: ActionConfirmation): Promise<void> {
    const proposal = this.state.proposal;
    invariant(
      proposal && this.state.status === 'proposed' && !this.controller,
      'Propose an action before executing',
    );
    const initial = this.options.context();
    const controller = new AbortController();
    this.controller = controller;
    const abort = () => controller.abort();
    initial.signal.addEventListener('abort', abort, { once: true });
    const deadline = setTimeout(abort, 30000);
    const check = () => {
      throwIfAborted(controller.signal);
      const context = this.options.context();
      invariant(
        context.scope === this.scope &&
          !context.preview &&
          !context.signal.aborted,
        'Action context changed',
      );
      const validated = validateActionProposal(
        proposal,
        this.options.registry,
        context.revision,
        [proposal.surfaceId],
      );
      return {
        ...validated,
        context: { ...context, signal: controller.signal },
      };
    };
    try {
      let { action, context } = check();
      const binding = this.options.bindings[action.id];
      invariant(binding, 'Action handler is missing');
      if (action.confirmation === 'required') {
        invariant(
          confirm,
          'Host confirmation is required',
          'CONFIRMATION_REQUIRED',
        );
        this.publish({ status: 'awaiting-confirmation', proposal });
        if (
          !(await abortable(
            confirm(proposal, controller.signal),
            controller.signal,
          ))
        ) {
          this.publish({ status: 'cancelled' });
          return;
        }
      }
      ({ action, context } = check());
      if (binding.available)
        invariant(
          await abortable(
            Promise.resolve(binding.available(proposal.arguments, context)),
            controller.signal,
          ),
          'Action is unavailable for the current session',
        );
      check();
      invariant(
        !this.used.has(proposal.requestId),
        'This action was already submitted',
      );
      // Fail closed after the bounded session budget; never evict IDs and accidentally replay a mutation.
      invariant(this.used.size < 1000, 'Action session budget exceeded');
      this.used.add(proposal.requestId);
      this.publish({ status: 'executing', proposal });
      const result = await abortable(
        binding.execute(proposal.arguments, {
          ...context,
          appId: this.options.registry.appId,
          proposal,
          idempotencyKey: JSON.stringify([
            this.options.registry.appId,
            context.scope,
            proposal.requestId,
          ]),
        }),
        controller.signal,
      );
      check();
      validateValues(result, action.result, 'Action result');
      this.options.invalidate(action.invalidates);
      this.publish({ status: 'succeeded', proposal, result });
    } catch (error) {
      this.publish({
        status: controller.signal.aborted ? 'cancelled' : 'failed',
        proposal: controller.signal.aborted ? undefined : proposal,
        code:
          error instanceof Error && 'code' in error
            ? String(error.code)
            : 'ACTION_FAILED',
      });
    } finally {
      clearTimeout(deadline);
      initial.signal.removeEventListener('abort', abort);
      if (this.controller === controller) this.controller = undefined;
    }
  }
}
