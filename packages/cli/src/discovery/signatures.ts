import type { Type } from 'ts-morph';
export function arrayItem(type: Type): Type | undefined {
  const resolved = type.getAwaitedType() ?? type;
  return (
    resolved.getArrayElementType() ??
    (resolved.isReadonlyArray() ? resolved.getTypeArguments()[0] : undefined)
  );
}
export function callable(type: Type) {
  return (
    type.getCallSignatures()[0] ??
    type.getUnionTypes().flatMap((t) => t.getCallSignatures())[0]
  );
}
