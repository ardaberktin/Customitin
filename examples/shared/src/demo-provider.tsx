import { throwIfAborted } from '@customitin/core';
import { useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CustomizationProvider,
  type ItemProps,
} from '@customitin/react-native';
import { asyncStorageAdapter } from '@customitin/react-native/storage';
import { createHttpPlanner } from '@customitin/react-native/adapters';
import type { Scalar } from '@customitin/core';
import { registries } from './registry';
import { demoPlan } from './demo-planner';
import { createDemoSource } from './sources';
import type { DemoKind } from './data';
import { DemoCard, Featured, Intro, Library } from './home-sections';
const storage = asyncStorageAdapter(AsyncStorage);
export function DemoProvider({
  kind,
  scope = 'local-device',
  navigate,
  children,
}: {
  kind: DemoKind;
  scope?: string;
  navigate: (id: string, params: Record<string, Scalar>) => void;
  children: ReactNode;
}) {
  const registry = registries[kind];
  const planner = useMemo(
    () =>
      process.env.EXPO_PUBLIC_PLANNER_URL
        ? createHttpPlanner({
            url: process.env.EXPO_PUBLIC_PLANNER_URL,
            getHeaders: async () => ({}),
            allowLocalhost: true,
          })
        : ({
            async plan(request, signal) {
              throwIfAborted(signal);
              return demoPlan(kind, request);
            },
          } satisfies import('@customitin/react-native').PlannerTransport),
    [kind],
  );
  const bindings = useMemo(
    () => ({
      sources: { catalog: createDemoSource(kind) },
      navigate,
      components: {
        intro: () => <Intro kind={kind} />,
        featured: () => <Featured kind={kind} />,
        library: () => <Library kind={kind} />,
      },
      items: {
        card: (props: ItemProps) => <DemoCard {...props} kind={kind} />,
      },
    }),
    [kind, navigate],
  );
  return (
    <CustomizationProvider
      options={{ registry, storage, scope, planner }}
      bindings={bindings}
    >
      {children}
    </CustomizationProvider>
  );
}
