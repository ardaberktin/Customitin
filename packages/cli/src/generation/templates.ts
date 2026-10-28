import type { CapabilityRegistry } from '@customitin/core';
import type { DiscoveryReport } from '../discovery/types';
import type { ResolvedIntegration } from '../configuration/resolve';
import { generateSources } from './sources';
import { generateComponents } from './components';
import { generateNavigation } from './navigation';
import { generateRoot } from './root';
export { relativeImport } from './imports';

export function generateFiles(
  report: DiscoveryReport,
  registry: CapabilityRegistry,
  integration: ResolvedIntegration,
): Record<string, string> {
  return {
    'personalize/capabilities.json': JSON.stringify(registry, null, 2) + '\n',
    'personalize/server-manifest.json':
      JSON.stringify(registry, null, 2) + '\n',
    'personalize/sources.ts': generateSources(integration),
    'personalize/components.tsx': generateComponents(
      integration,
      report.platform,
    ),
    'personalize/navigation.ts': generateNavigation(report, integration),
    'personalize/root.tsx': generateRoot(report),
    'personalize/README.md': `# Headless Customitin integration

The provider adds no visible UI, route, theme, or controls. Mount SurfaceRenderer inside a host-owned screen or use the generated existing-screen region bindings. Build your own assistant and confirmation UI with useAssistant/useAction.

Review discovery.json for found, bindable, and enabled capabilities. Generated bindings do not establish business semantics, authorization, or native-device verification. Edit overrides.json for surface permissions and config.ts for host storage, session, actions and custom adapters. These two files are developer-owned. Keep bindings.lock.json for stable identities.

Keep using the app's development command for automatic checks. Newly discovered capabilities remain pending approval. Run inspect, review the digest, and explicitly approve additions. Run doctor --typecheck and host interaction/bundle checks before release. Deploy matching server-manifest.json with the authenticated planner.
`,
  };
}
export function initialConfig(report: DiscoveryReport): string {
  const persistent =
    !!report.versions['@react-native-async-storage/async-storage'];
  if (report.platform === 'web')
    return `import { browserStorage } from '@customitin/react/storage';
import type { PlannerTransport } from '@customitin/react';
export const storage = { async getItem(key: string) { return browserStorage(window.localStorage).getItem(key); }, async setItem(key: string, value: string) { await browserStorage(window.localStorage).setItem(key, value); }, async removeItem(key: string) { await browserStorage(window.localStorage).removeItem(key); } };
export const scope = 'local-device';
export const planner: PlannerTransport | undefined = undefined;
export function useHostConfiguration() { return { scope }; }
`;
  return `${persistent ? "import AsyncStorage from '@react-native-async-storage/async-storage';\nimport { asyncStorageAdapter } from '@customitin/react-native/storage';" : "import { memoryStorage } from '@customitin/react/storage';"}
import type { PlannerTransport, RuntimeBindings } from '@customitin/react';
// Developer-owned. This file is never overwritten by refresh or removal.
export const storage = ${persistent ? 'asyncStorageAdapter(AsyncStorage)' : 'memoryStorage()'};
export const scope = 'local-device';
export const planner: PlannerTransport | undefined = undefined;
// Read your existing session hook here and return a stable user scope.
// Memoize custom bindings if they depend on session state.
export function useHostConfiguration(): { scope: string; bindings?: Partial<RuntimeBindings> } {
  return { scope };
}
`;
}
