# Contributing

Use Node from `.nvmrc`, run `npm ci` and `npm run build`, then `npm run check`. Add focused behavior tests for bugs and cross-package contracts. Keep SDK code domain-neutral, methods focused, and English copy in the main-language dictionary. Do not add translations as part of unrelated UI work.

Run Playwright for interaction changes and platform bundles for mobile changes. Changes to capability or profile schemas require explicit migration notes and recovery tests. New optional integrations belong behind separate exports/peers. Never commit `.env`, provider keys, session tokens, actual user data, or generated build artifacts.

Use a small pull request explaining the observable behavior, why it changes, and the validation performed. Security reports follow SECURITY.md. Contributions are under the MIT license.
