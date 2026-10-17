import type { ComponentType, ReactNode } from 'react';
import {
  defineCapabilities,
  defineComponent,
  defineSurface,
  memoryStorage,
} from '@customitin/core';
import {
  CustomizationProvider,
  SurfaceRenderer,
  useSurface,
  type HostComponentProps,
} from '@customitin/react';
import { en } from './strings';
const provenance = {
  version: 1,
  status: 'developer-reviewed' as const,
  evidence: 'Host element example',
};
const registry = defineCapabilities({
  appId: 'element-example',
  revision: 'element-v2',
  components: [
    defineComponent({
      id: 'title',
      title: en.elementTitle,
      kind: 'host',
      props: { text: { type: 'string', required: true } },
      acceptsChildren: false,
      provenance,
    }),
  ],
  surfaces: [
    defineSurface({
      id: 'title',
      title: en.elementTitle,
      mode: 'properties',
      defaultLayout: [
        {
          id: 'page-title',
          componentId: 'title',
          props: { text: en.elementText },
          children: [],
        },
      ],
      requiredNodeIds: [],
      allowedComponentIds: ['title'],
      policy: { operations: ['properties'], editableProps: ['text'] },
      provenance,
    }),
  ],
  sources: [],
  destinations: [],
  defaultNavigation: [],
  themeTokens: {},
  limits: { nodes: 1, depth: 1, sources: 1, tabs: 1 },
});
const options = { registry, scope: 'example', storage: memoryStorage() };
interface ElementControls {
  preview(text: string): void;
  apply(): Promise<void>;
  cancel(): void;
  undo(): Promise<void>;
}
/** A portable individual-element example; the caller supplies its element and all controls. */
export function ElementExample({
  component,
  children,
}: {
  component: ComponentType<HostComponentProps>;
  children: (controls: ElementControls) => ReactNode;
}) {
  return (
    <CustomizationProvider
      options={options}
      bindings={{ sources: {}, components: { title: component } }}
    >
      <ElementControls>{children}</ElementControls>
    </CustomizationProvider>
  );
}
function ElementControls({
  children,
}: {
  children: (controls: ElementControls) => ReactNode;
}) {
  const surface = useSurface('title');
  return (
    <>
      <SurfaceRenderer id="title" preview />
      {children({
        preview: (text) =>
          surface.preview(
            [{ ...surface.nodes[0]!, props: { text } }],
            en.elementChange,
          ),
        apply: surface.apply,
        cancel: surface.cancel,
        undo: surface.undo,
      })}
    </>
  );
}
