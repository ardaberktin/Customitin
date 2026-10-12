import { dirname, relative } from 'node:path';
import type { CapabilityRegistry } from '@customitin/core';
import type { DiscoveryReport } from '../discovery/scan';
export function generateFiles(
  report: DiscoveryReport,
  registry: CapabilityRegistry,
): Record<string, string> {
  const imports = registry.sources.map((source, index) => {
    const symbol = report.symbols.find((s) => s.id === source.id);
    if (!symbol) throw new Error('Missing evidence');
    return `import { ${symbol.name} as load${index} } from ${JSON.stringify('../' + symbol.file.replace(/\.tsx?$/, ''))};`;
  });
  return {
    'personalize/capabilities.json': JSON.stringify(registry, null, 2) + '\n',
    'personalize/server-manifest.json':
      JSON.stringify(registry, null, 2) + '\n',
    'personalize/sources.ts': `import { createLocalSource, registrySchema } from '@customitin/core';\nimport capabilities from './capabilities.json';\n${imports.join('\n')}\nconst registry = registrySchema.parse(capabilities);\nexport const sources = {\n${registry.sources
      .map(
        (s, i) =>
          `${JSON.stringify(s.id)}: createLocalSource(registry.sources[${i}]!, async () => (await load${i}()).map(row => ({ ${Object.keys(
            s.fields,
          )
            .map(
              (field) =>
                `${JSON.stringify(field)}: row[${JSON.stringify(field)}]`,
            )
            .join(', ')} }))),`,
      )
      .join('\n')}\n};\n`,
    'personalize/root.tsx': `import { useState, type ReactNode } from 'react';\nimport { ScrollView, View } from 'react-native';\nimport { registrySchema } from '@customitin/core';\nimport { ActionButton, CustomizableSurface, CustomizationProvider, PersonalizationScreen } from '@customitin/react-native';\nimport capabilities from './capabilities.json';\nimport { sources } from './sources';\nimport { storage, planner, scope } from './config';\nconst registry = registrySchema.parse(capabilities);\nconst bindings = { sources };\nexport function PersonalizationRoot({ children }: { children: ReactNode }) {\n const [screen, setScreen] = useState('original');\n return <CustomizationProvider options={{ registry, storage, scope, planner }} bindings={bindings}><View style={{ flex: 1 }}>{screen === 'customize' ? <PersonalizationScreen /> : screen === 'personal' ? <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24 }}><CustomizableSurface id="home" /></ScrollView> : children}<View style={{ flexDirection: 'row', gap: 8, padding: 12 }}><ActionButton label="Original app" onPress={() => setScreen('original')} secondary /><ActionButton label="My space" onPress={() => setScreen('personal')} secondary /><ActionButton label="Customize" onPress={() => setScreen('customize')} /></View></View></CustomizationProvider>;\n}\n`,
    'personalize/README.md': `# Generated integration\n\nConnected: ${registry.sources.map((s) => s.title).join(', ') || 'appearance and a personal surface only'}.\n\nSource semantics remain developer-reviewed. Original screens are preserved; SDK appearance controls affect SDK surfaces only. Existing navigation and private state are not rewritten. Configure config.ts with persistent host storage, your opaque profile scope, and createHttpPlanner from @customitin/react-native/adapters. Runtime credentials belong on your server. Deploy server-manifest.json with the planner.\n\nTry “use a dark reading theme” or “show ${registry.sources[0]?.title ?? 'my collection'} in a grid” with a connected planner.\n`,
  };
}
export const initialConfig = `import { memoryStorage } from '@customitin/react-native/storage';\nimport type { PlannerTransport } from '@customitin/react-native';\n// Developer-owned file. Replace memory storage with AsyncStorage or encrypted host storage.\nexport const storage = memoryStorage();\nexport const scope = 'local-device';\n// Set a developer-controlled endpoint and host session headers. Never put provider keys here.\nexport const planner: PlannerTransport | undefined = undefined;\n`;
export function relativeImport(from: string, to: string): string {
  const path = relative(dirname(from), to)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '');
  return path.startsWith('.') ? path : `./${path}`;
}
