import type { DiscoveryReport, DiscoveredSymbol } from '../discovery/types';
import type { IntegrationOverrides } from './overrides';
import { lookupOverride, referenceId, type IdentityLock } from './identity';
import type { SelectedSource } from './resolve';
export function selectSources(
  report: DiscoveryReport,
  overrides: IntegrationOverrides,
  lock: IdentityLock,
  queryClient: DiscoveredSymbol | undefined,
  issues: string[],
): SelectedSource[] {
  const sources: SelectedSource[] = [];
  for (const symbol of report.symbols.filter((s) => s.kind === 'source')) {
    const options = { ...lookupOverride(overrides.sources, symbol, lock) };
    if (options.detailDestination)
      options.detailDestination = referenceId(lock, options.detailDestination);
    if (
      options.enabled === false ||
      (lock.selectedSources &&
        !lock.selectedSources.includes(symbol.id) &&
        options.enabled !== true)
    )
      continue;
    if (
      symbol.adapter === 'query-options' &&
      !queryClient &&
      (symbol.complete ||
        options.enabled ||
        options.completeness === 'complete')
    ) {
      issues.push(
        `${symbol.selector}: export one existing QueryClient or select queryClient in overrides.`,
      );
      continue;
    }
    if (
      symbol.adapter !== 'query-page' &&
      !symbol.complete &&
      options.completeness !== 'complete'
    ) {
      if (options.enabled)
        issues.push(
          `${symbol.selector}: confirm completeness using overrides.sources[selector].completeness = "complete".`,
        );
      continue;
    }
    if (options.completeness === 'paginated' && symbol.adapter !== 'query-page')
      throw new Error(
        `${symbol.selector}: paginated sources require the @customitinQuery contract.`,
      );
    if (symbol.adapter === 'query-page' && options.completeness === 'complete')
      throw new Error(
        `${symbol.selector}: query-page sources must remain paginated.`,
      );
    const id = options.idField ?? 'id';
    const rule = symbol.fields[id];
    if (!rule || rule.nullable || !['string', 'number'].includes(rule.type)) {
      issues.push(
        `${symbol.selector}: choose a non-nullable string/number idField.`,
      );
      continue;
    }
    sources.push({ symbol, options });
  }
  return sources;
}
