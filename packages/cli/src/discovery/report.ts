import { createHash } from 'node:crypto';
import type { DiscoveryReport } from './types';
import type { IntegrationOverrides } from '../configuration/overrides';
import type { IdentityLock } from '../configuration/identity';
import { lookupOverride } from '../configuration/identity';

export function capabilityReport(
  report: DiscoveryReport,
  overrides: IntegrationOverrides,
  lock: IdentityLock,
) {
  const capabilities = report.symbols
    .filter((symbol) => ['source', 'component'].includes(symbol.kind))
    .map((symbol) => {
      const selected =
        symbol.kind === 'source'
          ? lookupOverride(overrides.sources, symbol, lock)
          : lookupOverride(overrides.components, symbol, lock);
      const reasons = [
        ...symbol.unsupportedProps.map(
          (name) => `Required ${name} needs a host adapter.`,
        ),
      ];
      if (
        symbol.kind === 'component' &&
        symbol.file === report.entry &&
        symbol.exportName === 'default'
      )
        reasons.push(
          'Application entrypoints are not suggested as reusable components.',
        );
      if (
        symbol.kind === 'source' &&
        !symbol.complete &&
        symbol.adapter !== 'query-page' &&
        !('completeness' in (selected ?? {}))
      )
        reasons.push(
          'Confirm the complete authorized dataset or supply a remote query adapter.',
        );
      const enabled =
        selected?.enabled === true ||
        (symbol.kind === 'source' &&
          !!lock.selectedSources?.includes(symbol.id) &&
          selected?.enabled !== false);
      return {
        id: symbol.id,
        selector: symbol.selector,
        kind: symbol.kind,
        location: { file: symbol.file, line: symbol.line },
        usage: symbol.usage ?? [],
        status: enabled
          ? 'enabled'
          : reasons.length
            ? 'discovered'
            : 'bindable',
        suggested: !reasons.length && selected?.enabled !== false,
        reasons,
        evidence: symbol.signature,
        checks: [] as string[],
      };
    });
  const summary = {
    version: 2,
    platform: report.platform,
    navigation: report.framework,
    capabilities,
    importedComponents: report.importedComponents ?? [],
    exclusions: report.excludedFiles,
    diagnostics: [...report.unsupported, ...report.unresolved],
  };
  // Include reviewed policy/config decisions, not just component names, in the approval identity.
  const digest = createHash('sha256')
    .update(
      JSON.stringify({ summary, overrides, sourceDigest: report.sourceDigest }),
    )
    .digest('hex');
  return { ...summary, digest };
}
export function formatReport(report: ReturnType<typeof capabilityReport>) {
  const lines = [
    `Customitin discovery v2 — ${report.platform ?? 'unknown'} / ${report.navigation}`,
    `Approval digest: ${report.digest}`,
    '',
  ];
  for (const item of report.capabilities)
    lines.push(
      `[${item.status}] ${item.selector}`,
      ...item.reasons.map((reason) => `  ${reason}`),
    );
  lines.push(
    '',
    `${report.capabilities.filter((item) => item.suggested).length} suggested capabilities; ${report.importedComponents.length} imported component usages.`,
    'Review source fields, component context, and surface permissions before enabling.',
    ...report.diagnostics.map((issue) => `Attention: ${issue}`),
  );
  return lines.join('\n');
}
