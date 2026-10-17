import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useCustomization } from '@customitin/react';
import { CustomizableScreen } from './screen';

export interface CustomizableLayoutProps {
  id: string;
  sectionIds: Record<string, string>;
  children: ReactElement<{ children?: ReactNode }>;
}

/** Editable JSX remains in the host; the CLI maintains only the section ID map. */
export function CustomizableLayout({
  id,
  sectionIds,
  children,
}: CustomizableLayoutProps) {
  const { registry } = useCustomization();
  const sections: Record<string, ReactNode> = {};
  let matches = true;
  Children.forEach(children.props.children, (child) => {
    if (child === null || child === undefined || typeof child === 'boolean')
      return;
    if (!isValidElement(child) || child.key === null) {
      matches = false;
      return;
    }
    const nodeId = Object.hasOwn(sectionIds, String(child.key))
      ? sectionIds[String(child.key)]
      : undefined;
    if (!nodeId || Object.hasOwn(sections, nodeId)) {
      matches = false;
      return;
    }
    sections[nodeId] = child;
  });
  const surface = registry.surfaces.find((candidate) => candidate.id === id);
  // A save can reach Fast Refresh before CLI regeneration. Keep new host UI visible.
  if (
    !matches ||
    !surface ||
    surface.kind !== 'screen' ||
    surface.defaultLayout.length !== Object.keys(sections).length ||
    surface.defaultLayout.some((node) => !Object.hasOwn(sections, node.id))
  )
    return children;
  return (
    <CustomizableScreen id={id} sections={sections}>
      {(content) => cloneElement(children, undefined, content)}
    </CustomizableScreen>
  );
}
