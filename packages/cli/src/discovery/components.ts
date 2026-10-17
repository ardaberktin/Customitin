import type { Node, Signature } from 'ts-morph';
import { scalarFields, valueRule } from './fields';
import { arrayItem, callable } from './signatures';
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
    const declaredType = prop.getTypeAtLocation(location);
    const propType = declaredType.getNonNullableType();
    const rule = valueRule(declaredType, prop.isOptional());
    if (rule) symbol.props[propName] = rule;
    else if (propName === 'children') symbol.acceptsChildren = true;
    else if (
      arrayItem(propType) &&
      Object.keys(scalarFields(arrayItem(propType)!, location)).length
    ) {
      const item = arrayItem(propType)!;
      const fields = scalarFields(item, location);
      if (Object.keys(fields).length === item.getProperties().length) {
        symbol.dataProps ??= {};
        symbol.dataProps[propName] = {
          fields,
          cardinality: 'many',
          required: !prop.isOptional(),
        };
      } else if (!prop.isOptional()) symbol.unsupportedProps.push(propName);
    } else if (
      propName === 'onPress' &&
      prop.isOptional() &&
      callable(propType)
    )
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
      symbol.dataProps ??= {};
      symbol.dataProps[propName] = {
        fields: symbol.itemFields,
        cardinality: 'one',
        required: !prop.isOptional(),
      };
    } else if (!prop.isOptional()) symbol.unsupportedProps.push(propName);
  }
  symbol.signature = `${name}: component ${JSON.stringify({ props: symbol.props, itemProp: symbol.itemProp, itemFields: symbol.itemFields, unsupportedProps: symbol.unsupportedProps, dataProps: symbol.dataProps, acceptsChildren: symbol.acceptsChildren })}`;
  return symbol;
}
