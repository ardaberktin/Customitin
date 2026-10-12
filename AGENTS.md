Use strict TypeScript and small, readable modules. Fix lint errors and warnings. Keep domain logic out of SDK packages. New UI copy goes in the English dictionary only. Run npm run check and relevant interaction tests after changes. Document manual deployment and device checks honestly.

For SDK integration or CLI changes, start with [docs/ai/index.md](docs/ai/index.md). Supported contracts are in docs/ai/contracts.md; file ownership and stable identity rules are in docs/ai/maintenance.md. Preserve developer-owned config/overrides and do not infer completeness from cached rows.

AI documentation source lives in docs/ai. After editing it, run npm run docs:build to regenerate llms-full.txt; npm run check verifies the bundle. Build copies the guides into every package's dist/docs. Add compiling consumer fixtures for new automatic binding patterns and interaction coverage for generated UI behavior.
