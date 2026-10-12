#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { overridesSchema } from './configuration/overrides';
import { selectedOverrides } from './commands/options';
import { readGuide } from './commands/guide';
import {
  doctorProject,
  inspectProject,
  installProject,
  proposeMapping,
  removeProject,
} from './api';
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      cwd: { type: 'string' },
      apply: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      context: { type: 'boolean' },
      'approve-context': { type: 'string' },
      ai: { type: 'boolean' },
      complete: { type: 'string', multiple: true },
      component: { type: 'string', multiple: true },
      route: { type: 'string', multiple: true },
      detail: { type: 'string', multiple: true },
      'query-client': { type: 'string' },
      'navigation-ref': { type: 'string' },
      typecheck: { type: 'boolean' },
      topic: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || positionals[0] === 'help') {
    console.log(`Usage: customitin <command> [options]

Commands: inspect, init, doctor, refresh, remove, schema, guide
  --cwd <directory>           Select the host application
  --context                   Show the exact optional AI context
  --dry-run                   Preview changes (the default)
  --apply                     Write installer-owned changes
  --ai                        Ask the configured provider to select adapters
  --complete <selector>       Confirm a complete source (repeatable, saved in overrides)
  --component <selector>      Enable a discovered component (repeatable)
  --route <selector>          Enable a discovered route (repeatable)
  --detail <source=route>     Connect source rows to a detail route and enable it
  --query-client <selector>   Select an exported QueryClient
  --navigation-ref <selector> Select an exported React Navigation ref
  --typecheck                 Include static TypeScript diagnostics in doctor
  --topic <name>              Select an AI integration guide chapter
  --approve-context <digest>  Consent to the reviewed context
  --help, -h                  Show this help

AI requires CUSTOMITIN_INSTALLER_API_KEY and CUSTOMITIN_INSTALLER_MODEL.
When both --apply and --dry-run are passed, --dry-run takes precedence.`);
    return;
  }
  const root = resolve(values.cwd ?? process.cwd());
  const dryRun = !values.apply || !!values['dry-run'];
  const command = positionals[0] ?? 'inspect';
  if (command === 'guide') {
    console.log(await readGuide(values.topic));
  } else if (command === 'schema') {
    console.log(JSON.stringify(z.toJSONSchema(overridesSchema), null, 2));
  } else if (command === 'inspect') {
    const report = await inspectProject(root);
    console.log(
      JSON.stringify(
        {
          ...report,
          context: values.context
            ? JSON.parse(report.context)
            : 'Use --context to inspect exactly what can be sent to your provider.',
        },
        null,
        2,
      ),
    );
  } else if (command === 'doctor') {
    const result = await doctorProject(root, { typecheck: values.typecheck });
    console.log(JSON.stringify(result, null, 2));
    if (result.issues.length) process.exitCode = 1;
  } else if (command === 'remove') {
    const result = await removeProject(root, dryRun);
    console.log(JSON.stringify(result, null, 2));
    if (result.conflicts.length) process.exitCode = 1;
  } else if (command === 'init' || command === 'refresh') {
    let selectedIds: string[] | undefined;
    if (values.ai) {
      const key = process.env.CUSTOMITIN_INSTALLER_API_KEY;
      const model = process.env.CUSTOMITIN_INSTALLER_MODEL;
      if (!key || !model || !values['approve-context'])
        throw new Error(
          'AI analysis requires CUSTOMITIN_INSTALLER_API_KEY, CUSTOMITIN_INSTALLER_MODEL and --approve-context <reviewed digest>.',
        );
      const result = await proposeMapping(await inspectProject(root), {
        approvedDigest: values['approve-context'],
        apiKey: key,
        model,
      });
      selectedIds = result.sources.map((s) => s.symbolId);
    }
    const result = await installProject(root, {
      dryRun,
      selectedIds,
      overrides: await selectedOverrides(root, values),
    });
    console.log(
      JSON.stringify(
        {
          mode: dryRun ? 'dry-run' : 'apply',
          changes: result.changes,
          conflicts: result.conflicts,
          unresolved: result.report.unresolved,
          issues: result.issues,
          generated: result.files,
          developerOwnedSetup: result.setup,
          contextDigest: result.report.contextDigest,
        },
        null,
        2,
      ),
    );
    if (result.conflicts.length || result.issues.length) process.exitCode = 1;
  } else
    throw new Error(
      'Commands: inspect, init, doctor, refresh, remove, schema, guide. Changes require --apply; use --cwd to select an application.',
    );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Installer failed');
  process.exitCode = 1;
});
