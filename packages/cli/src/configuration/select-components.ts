import type { DiscoveryReport } from '../discovery/types';
import type { IntegrationOverrides } from './overrides';
import { lookupOverride, referenceId, type IdentityLock } from './identity';
import type { SelectedSource, SelectedComponent } from './resolve';
export function selectComponents(
  report: DiscoveryReport,
  overrides: IntegrationOverrides,
  lock: IdentityLock,
  sources: SelectedSource[],
  issues: string[],
): SelectedComponent[] {
  const components: SelectedComponent[] = [];
  for (const symbol of report.symbols.filter((s) => s.kind === 'component')) {
    const options = lookupOverride(overrides.components, symbol, lock) ?? {
      defaults: {},
    };
    if (options.enabled !== true) continue;
    if (symbol.unsupportedProps.length) {
      issues.push(
        `${symbol.selector}: wrap required props ${symbol.unsupportedProps.join(', ')} before enabling.`,
      );
      continue;
    }
    if (symbol.itemProp && options.source) {
      const compatible = sources.filter(
        ({ symbol: s, options: o }) =>
          (!options.source || s.id === referenceId(lock, options.source)) &&
          Object.entries(symbol.itemFields ?? {}).every(([field, rule]) => {
            const actual = s.fields[field];
            return (
              actual &&
              (!o.fields || o.fields.includes(field)) &&
              actual.type === rule.type &&
              (!actual.nullable || rule.nullable) &&
              (!rule.values ||
                actual.values?.every((v) => rule.values?.includes(v)))
            );
          }),
      );
      if (compatible.length !== 1) {
        issues.push(
          `${symbol.selector}: select one compatible source for item prop ${symbol.itemProp}.`,
        );
        continue;
      }
      if (
        Object.entries(symbol.props).some(
          ([k, r]) => r.required && !(k in options.defaults),
        )
      ) {
        issues.push(
          `${symbol.selector}: supply defaults for required item props.`,
        );
        continue;
      }
      components.push({ symbol, options, sourceId: compatible[0]!.symbol.id });
    } else components.push({ symbol, options });
  }
  return components;
}
