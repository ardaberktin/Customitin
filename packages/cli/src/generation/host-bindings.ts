import { createHash } from 'node:crypto';
import { ts } from 'ts-morph';
import { z } from 'zod';

const binding = z
  .object({
    module: z.string(),
    name: z.string(),
    local: z.string(),
  })
  .strict();
export const hostBindingsSchema = z
  .object({
    imports: z.array(binding.extend({ restore: binding.optional() })).max(160),
    wrappers: z
      .array(
        z
          .object({
            local: z.string(),
            attributes: z.string(),
            singleChild: z.boolean(),
          })
          .strict(),
      )
      .max(41),
  })
  .strict();
export type HostBindings = z.infer<typeof hostBindingsSchema>;
export const emptyHostBindings = (): HostBindings => ({
  imports: [],
  wrappers: [],
});

/** Formatting and quote changes are harmless; changes to SDK props are not. */
export function syntaxHash(text: string): string {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true);
  scanner.setText(text);
  const tokens: string[] = [];
  for (
    let token = scanner.scan();
    token !== ts.SyntaxKind.EndOfFileToken;
    token = scanner.scan()
  ) {
    if (
      token === ts.SyntaxKind.CommaToken &&
      [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.CloseBracketToken].includes(
        scanner.lookAhead(() => scanner.scan()),
      )
    )
      continue;
    const value = scanner.getTokenValue();
    const propertyName =
      token === ts.SyntaxKind.StringLiteral &&
      /^[A-Za-z_$][\w$]*$/.test(value) &&
      scanner.lookAhead(() => scanner.scan()) === ts.SyntaxKind.ColonToken;
    tokens.push(
      token === ts.SyntaxKind.StringLiteral && !propertyName
        ? JSON.stringify(value)
        : propertyName
          ? value
          : scanner.getTokenText(),
    );
  }
  return createHash('sha256').update(JSON.stringify(tokens)).digest('hex');
}
