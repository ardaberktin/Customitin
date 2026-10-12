import type { Node, Signature } from 'ts-morph';
import { scalarFields, valueRule } from './fields';
import { callable } from './signatures';
import type { DiscoveredSymbol } from './types';
type SymbolBase = Omit<DiscoveredSymbol, 'kind' | 'signature'>;
export function discoverComponent(
  base: SymbolBase,
  signature: Signature,
  location: Node,
): DiscoveredSymbol | undefined {
  const name = base.name;
  const renderType = signature.getReturnType().getText(location);
  if (
    !/^[A-Z]/.test(name) ||
    signature.getParameters().length > 1 ||
    !/(Element|ReactNode|ReactElement)/.test(renderType)
  )
    return;
  const symbol: DiscoveredSymbol = {
    ...base,
    kind: 'component',
    signature: '',
    unsupportedProps: [],
  };
  const props = signature.getParameters()[0]?.getTypeAtLocation(location);
  for (const prop of props?.getProperties() ?? []) {
    const propName = prop.getName();
    const propType = prop.getTypeAtLocation(location);
    const rule = valueRule(propType, prop.isOptional());
    if (rule) symbol.props[propName] = rule;
    else if (propName === 'onPress' && prop.isOptional() && callable(propType))
      symbol.pressProp = propName;
    else if (
      !symbol.itemProp &&
      !propType.isArray() &&
      propType.getProperties().length &&
      Object.keys(scalarFields(propType, location)).length ===
        propType.getProperties().length
    ) {
      symbol.itemProp = propName;
      symbol.itemFields = scalarFields(propType, location);
    } else if (!prop.isOptional()) symbol.unsupportedProps.push(propName);
  }
  symbol.signature = `${name}: component ${JSON.stringify({ props: symbol.props, itemProp: symbol.itemProp, itemFields: symbol.itemFields, unsupportedProps: symbol.unsupportedProps })}`;
  return symbol;
}
