import { join } from 'node:path';
import { Project, ts } from 'ts-morph';
import { planInstall } from './install';

export async function integrationDiagnostics(
  root: string,
  typecheck: boolean,
): Promise<string[]> {
  const issues: string[] = [];
  try {
    const plan = await planInstall(root);
    issues.push(...plan.issues);
    issues.push(...plan.conflicts);
    if (plan.changes.length)
      issues.push(`Refresh required: ${plan.changes.join(', ')}`);
  } catch (error) {
    issues.push(`Integration configuration: ${(error as Error).message}`);
  }
  if (typecheck) {
    try {
      const project = new Project({
        tsConfigFilePath: join(root, 'tsconfig.json'),
      });
      project.addSourceFilesAtPaths(join(root, 'personalize/**/*.{ts,tsx}'));
      for (const diagnostic of project.getPreEmitDiagnostics().slice(0, 50)) {
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.compilerObject.messageText,
          '\n',
        );
        issues.push(
          `TypeScript ${diagnostic.getCode()}: ${diagnostic.getSourceFile()?.getFilePath() ?? 'configuration'}:${diagnostic.getLineNumber() ?? 0}: ${message}`,
        );
      }
    } catch (error) {
      issues.push(`TypeScript check unavailable: ${(error as Error).message}`);
    }
  }
  return issues;
}
