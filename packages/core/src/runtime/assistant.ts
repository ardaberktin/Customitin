import {
  configurationSchema,
  plannerRequestSchema,
  plannerResponseSchema,
  type PlannerRequest,
  type PlannerResponse,
} from '../schema/configuration';
import type { ActionProposal } from '../schema/data-plan';
import type { CapabilityRegistry } from '../schema/registry';
import { invariant } from '../schema/primitives';
import { applyProposal } from '../patches/apply';
import { validatePlanningTarget } from '../validation/planning';
import { validateActionProposal } from '../actions/validate';
import { abortable } from './cancellation';
import type { RuntimeState } from './runtime';

export interface PlannerTransport {
  plan(request: PlannerRequest, signal: AbortSignal): Promise<PlannerResponse>;
}
export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}
interface Options {
  registry: CapabilityRegistry;
  transport?: PlannerTransport;
  snapshot(): RuntimeState;
  signal(): AbortSignal;
  publish(patch: Partial<RuntimeState>): void;
  createId(): string;
  action(proposal: ActionProposal): void;
  canPlan?(): boolean;
  permittedContext?: () => NonNullable<PlannerRequest['context']>;
}
export class AssistantController {
  private pending?: AbortController;
  private conversation: ConversationTurn[] = [];
  constructor(private options: Options) {}
  cancel() {
    this.pending?.abort();
    this.pending = undefined;
    this.options.publish({ busy: false });
  }
  clear() {
    this.cancel();
    this.conversation = [];
    this.options.publish({ conversation: [] });
  }
  async request(instruction: string, target?: string | string[]) {
    invariant(
      this.options.canPlan?.() !== false,
      'Finish the current operation before planning',
    );
    const { registry, transport } = this.options;
    const current = this.options.snapshot().profile;
    invariant(current, 'Customization is still loading');
    invariant(
      instruction.trim().length > 0 && instruction.length <= 2000,
      'Instruction must contain 1–2000 characters',
    );
    const surfaceIds = typeof target === 'string' ? [target] : target;
    validatePlanningTarget(registry, surfaceIds);
    if (!transport) {
      this.options.publish({
        code: 'PLANNER_UNAVAILABLE',
        message: 'Connect a planner to use the assistant.',
      });
      return;
    }
    this.cancel();
    const controller = new AbortController();
    this.pending = controller;
    const signal = this.options.signal(),
      abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const deadline = setTimeout(abort, 30000),
      requestId = this.options.createId();
    const history = [
      ...this.conversation,
      { role: 'user' as const, text: instruction },
    ].slice(-12);
    this.options.publish({
      busy: true,
      message: undefined,
      code: undefined,
      preview: undefined,
      proposal: undefined,
      previewSurfaceId: undefined,
      previewSurfaceIds: undefined,
    });
    try {
      const response = plannerResponseSchema.parse(
        await abortable(
          transport.plan(
            plannerRequestSchema.parse({
              appId: registry.appId,
              requestId,
              registryRevision: registry.revision,
              baseRevision: current.revision,
              instruction,
              ...(surfaceIds
                ? {
                    surfaceIds,
                    ...(surfaceIds.length === 1
                      ? { surfaceId: surfaceIds[0] }
                      : {}),
                  }
                : {}),
              context: this.options.permittedContext?.(),
              conversation: this.conversation,
              configuration: configurationSchema.parse({
                theme: current.theme,
                views: current.views,
                dataViews: current.dataViews,
                surfaces: current.surfaces,
                navigation: current.navigation,
              }),
            }),
            controller.signal,
          ),
          controller.signal,
        ),
      );
      if (
        controller.signal.aborted ||
        signal.aborted ||
        this.pending !== controller
      )
        return;
      const profile = this.options.snapshot().profile;
      invariant(profile, 'Customization is unavailable');
      if (response.kind === 'proposal') {
        invariant(
          response.proposal.requestId === requestId,
          'The response belongs to an earlier request',
        );
        validatePlanningTarget(
          registry,
          surfaceIds,
          response.proposal.operations,
          profile,
        );
        this.options.publish({
          proposal: response.proposal,
          preview: applyProposal(profile, response.proposal, registry),
          previewSurfaceIds: surfaceIds,
          previewSurfaceId:
            surfaceIds?.length === 1 ? surfaceIds[0] : undefined,
        });
      } else if (response.kind === 'action-proposal') {
        invariant(
          response.proposal.requestId === requestId,
          'The response belongs to an earlier request',
        );
        validateActionProposal(
          response.proposal,
          registry,
          profile.revision,
          surfaceIds ?? [],
        );
        this.options.action(response.proposal);
      } else
        this.options.publish({
          message: response.message,
          code: response.kind.toUpperCase().replaceAll('-', '_'),
        });
      const text =
        'proposal' in response ? response.proposal.summary : response.message;
      this.conversation = [
        ...history,
        { role: 'assistant' as const, text },
      ].slice(-12);
      this.options.publish({ conversation: this.conversation });
    } catch {
      if (this.pending === controller && !signal.aborted)
        this.options.publish({
          code: controller.signal.aborted
            ? 'PLANNING_CANCELLED'
            : 'PLANNING_FAILED',
          message: 'The change could not be prepared.',
        });
    } finally {
      clearTimeout(deadline);
      signal.removeEventListener('abort', abort);
      if (this.pending === controller) {
        this.pending = undefined;
        this.options.publish({ busy: false });
      }
    }
  }
}
