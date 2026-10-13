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
    'personalize/components.tsx': generateComponents(integration),
    'personalize/navigation.ts': generateNavigation(report, integration),
    'personalize/root.tsx': generateRoot(
      report,
      integration.screens.length > 0,
    ),
    'personalize/README.md': `# Generated Customitin integration

Connected sources: ${registry.sources.map((s) => s.title).join(', ') || 'none yet'}.
Connected components: ${integration.components.map((c) => c.symbol.name).join(', ') || 'generic cards'}.
Connected routes: ${integration.routes.map((r) => r.title).join(', ') || 'original app only'}.

Edit overrides.json for capability decisions; edit config.ts for host storage, session and planner configuration. All other files here are generated. Commit bindings.lock.json to retain IDs through file moves. Do not hand-edit generated adapters; supply custom bindings through useHostConfiguration in config.ts.

Run customitin inspect --cwd <app> for selectors. Edit overrides, run customitin refresh --dry-run, review, then refresh --apply. Run customitin doctor and your application checks. Run customitin guide for bundled AI documentation and customitin guide --topic testing for consumer checks.

${integration.screens.length ? 'Selected existing screens have inline customization controls. Edit their ordinary JSX, hooks, styles and callbacks directly; keep section keys stable and generated wrapper imports/props intact. Run customitin watch --apply alongside the dev server to update section registration after saves, or refresh --apply on demand. Removal and refresh preserve current host edits. Text-size and numeric-gap preferences affect connected primitives. Required sections are configured in overrides.' : 'Original screens stay mounted. Generated UI adds Original app, My space and Customize. Saved view navigation is handled within My space. SDK appearance affects SDK surfaces; existing styles and provider dependencies require a host bridge.'} Use a user-specific scope on login/account changes. Deploy the matching server-manifest.json with the developer-owned planner. Provider keys belong on the server.
`,
  };
}
export function initialConfig(report: DiscoveryReport): string {
  const persistent =
    !!report.versions['@react-native-async-storage/async-storage'];
  return `${persistent ? "import AsyncStorage from '@react-native-async-storage/async-storage';\nimport { asyncStorageAdapter } from '@customitin/react-native/storage';" : "import { memoryStorage } from '@customitin/react-native/storage';"}
import type { PlannerTransport, RuntimeBindings } from '@customitin/react-native';
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
