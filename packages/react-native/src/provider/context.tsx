import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from 'react';
import type {
  CapabilityRegistry,
  Profile,
  Row,
  Scalar,
  SourceAdapter,
} from '@customitin/core';
import { CustomizationRuntime, type RuntimeOptions } from './runtime';
export interface HostComponentProps {
  values: Record<string, Scalar>;
  children?: ReactNode;
}
export interface ItemProps {
  row: Row;
  title: string;
  subtitle?: string;
  compact: boolean;
  onPress?: () => void;
}
export interface RuntimeBindings {
  sources: Record<string, SourceAdapter>;
  components?: Record<string, ComponentType<HostComponentProps>>;
  items?: Record<string, ComponentType<ItemProps>>;
  navigate?: (destinationId: string, params: Record<string, Scalar>) => void;
  session?: unknown;
}
interface ContextValue {
  runtime: CustomizationRuntime;
  registry: CapabilityRegistry;
  bindings: RuntimeBindings;
}
const Context = createContext<ContextValue | null>(null);
const PreviewContext = createContext<Profile | null>(null);
export function CustomizationProvider({
  options,
  bindings,
  children,
}: {
  options: RuntimeOptions;
  bindings: RuntimeBindings;
  children: ReactNode;
}) {
  const { registry, storage, scope, planner, createId } = options;
  const runtime = useMemo(
    () =>
      new CustomizationRuntime({ registry, storage, scope, planner, createId }),
    [registry, storage, scope, planner, createId],
  );
  useEffect(() => {
    void runtime.start();
    return () => runtime.dispose();
  }, [runtime]);
  const value = useMemo(
    () => ({ runtime, registry, bindings }),
    [runtime, registry, bindings],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCustomization() {
  const context = useContext(Context);
  if (!context) throw new Error('CustomizationProvider is missing');
  const state = useSyncExternalStore(
    context.runtime.subscribe,
    context.runtime.getSnapshot,
    context.runtime.getSnapshot,
  );
  return { ...context, ...state };
}
export function useRenderedProfile(): Profile | undefined {
  const preview = useContext(PreviewContext);
  const { profile } = useCustomization();
  return preview ?? profile;
}
export function ProfilePreview({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  return (
    <PreviewContext.Provider value={profile}>
      {children}
    </PreviewContext.Provider>
  );
}
