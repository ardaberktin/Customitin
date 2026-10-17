import { Boundary } from './boundary';
import { Input } from './input';
import type { StatusRenderer } from './types';
export type { SurfaceStatus } from './types';
import { Fragment } from 'react';
import {
  evaluateExpression,
  validateValues,
  type DataResult,
  type LayoutNode,
  type Scalar,
} from '@customitin/core';
import {
  ProfilePreview,
  useCustomization,
  type HostComponentProps,
} from '../provider/context';
import { useSurface } from '../hooks/use-surface';

function SurfaceNode({
  node,
  surfaceId,
  status,
  preview,
}: {
  node: LayoutNode;
  surfaceId: string;
  status?: StatusRenderer;
  preview: boolean;
}) {
  const { bindings, registry, runtime, profile } = useCustomization();
  const descriptor = registry.components.find(
    (item) => item.id === node.componentId,
  );
  const Host = bindings.components?.[node.componentId];
  if (!Host || !descriptor)
    return (
      status?.({ code: 'COMPONENT_UNBOUND', surfaceId, nodeId: node.id }) ??
      null
    );
  const events: NonNullable<HostComponentProps['events']> = {};
  for (const [name, binding] of Object.entries(node.events ?? {}))
    events[name] = (values: Record<string, Scalar>) => {
      if (preview || !profile) return;
      validateValues(values, descriptor.events?.[name] ?? {}, 'Event');
      runtime.actions.propose({
        requestId: runtime.allocateId(),
        registryRevision: registry.revision,
        baseRevision: profile.revision,
        surfaceId,
        actionId: binding.actionId,
        arguments: Object.fromEntries(
          Object.entries(binding.arguments).map(([key, expression]) => [
            key,
            evaluateExpression(expression, values),
          ]),
        ),
        summary:
          registry.actions.find((item) => item.id === binding.actionId)
            ?.title ?? binding.actionId,
      });
    };
  const render = (data: Record<string, DataResult>) => (
    <Host values={node.props} data={data} events={events}>
      {node.children.map((child) => (
        <SurfaceNode
          key={child.id}
          {...{ node: child, surfaceId, status, preview }}
        />
      ))}
    </Host>
  );
  const names = Object.keys(node.data ?? {});
  return (
    <Boundary
      resetKey={JSON.stringify(node)}
      key={`${runtime.activeScope}:${node.componentId}`}
      fallback={
        status?.({ code: 'COMPONENT_FAILED', surfaceId, nodeId: node.id }) ??
        null
      }
    >
      {names.length ? (
        <Input {...{ node, surfaceId, names, status }} index={0} data={{}}>
          {render}
        </Input>
      ) : (
        render({})
      )}
    </Boundary>
  );
}
function Content({
  id,
  status,
  preview,
}: {
  id: string;
  status?: StatusRenderer;
  preview: boolean;
}) {
  const { nodes, loading } = useSurface(id);
  if (loading)
    return status?.({ code: 'PROFILE_LOADING', surfaceId: id }) ?? null;
  return (
    <Fragment>
      {nodes.map((node) => (
        <SurfaceNode
          key={node.id}
          node={node}
          surfaceId={id}
          status={status}
          preview={preview}
        />
      ))}
    </Fragment>
  );
}
/** Renders only host-registered components; no container, colors, controls or fallback text. */
export function SurfaceRenderer({
  id,
  preview = false,
  status,
}: {
  id: string;
  preview?: boolean;
  status?: StatusRenderer;
}) {
  const state = useCustomization();
  const selected =
    preview && state.previewSurfaceIds?.includes(id)
      ? state.preview
      : state.profile;
  return (
    <ProfilePreview profile={selected ?? null}>
      <Content id={id} status={status} preview={preview} />
    </ProfilePreview>
  );
}
