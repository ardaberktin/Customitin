import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
// Keep the subpath on the public module's context when package entries are bundled separately.
import { useCustomization } from '@customitin/react';
/** Static keyed DOM regions; no styles are introduced except visibility of hidden regions. */
export function CustomizableLayout({
  id,
  sectionIds,
  children,
}: {
  id: string;
  sectionIds: Record<string, string>;
  children: ReactElement<{ children?: ReactNode }>;
}) {
  const { registry, profile, preview, previewSurfaceIds, runtime } =
    useCustomization();
  const sections: Record<string, ReactNode> = {};
  let valid = true;
  Children.forEach(children.props.children, (child) => {
    if (child == null || typeof child === 'boolean') return;
    if (!isValidElement(child) || child.key === null) {
      valid = false;
      return;
    }
    const key = Object.hasOwn(sectionIds, String(child.key))
      ? sectionIds[String(child.key)]
      : undefined;
    if (!key || sections[key]) {
      valid = false;
      return;
    }
    sections[key] = child;
  });
  const surface = registry.surfaces.find((item) => item.id === id);
  if (
    !valid ||
    !surface ||
    surface.defaultLayout.length !== Object.keys(sections).length ||
    surface.defaultLayout.some((node) => !sections[node.id])
  )
    return children;
  const nodes =
    (previewSurfaceIds?.includes(id) ? preview : undefined)?.surfaces[id] ??
    profile?.surfaces[id] ??
    surface.defaultLayout;
  const visible = new Set(nodes.map((node) => node.id));
  return cloneElement(
    children,
    undefined,
    [
      ...nodes,
      ...surface.defaultLayout.filter((node) => !visible.has(node.id)),
    ].map((node) => (
      <div
        key={`${runtime.activeScope}:${node.id}`}
        data-customitin-section={node.id}
        hidden={!visible.has(node.id)}
        style={
          visible.has(node.id) ? { display: 'contents' } : { display: 'none' }
        }
      >
        {sections[node.id]}
      </div>
    )),
  );
}
