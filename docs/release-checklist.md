# Alpha and public-release gates

Completed functionality is described in the README and the verification record. Before a public MVP release:

- Resolve the remaining upstream npm audit advisories in the pinned RN/Expo toolchain or review/document the exact affected paths. Some advisories have no patched version in this compatibility line. Do not downgrade Expo using npm audit --force.
- Deploy a developer-owned planner with real session verification, distributed limits and budgets; run a budgeted real-provider semantic evaluation. The deterministic demo/fixture suite proves protocol behavior, not AI quality.
- Test at least five independent pilot applications. Record support/failures, manual changes, elapsed onboarding time and consented aggregate metrics. No pilot installation or success percentage is claimed here.
- Evaluate the expanded discovery/generation against independent apps. Complete repositories, zero-argument query factories, explicit paginated contracts, scalar-prop components and simple route bindings now have fixture coverage; parameterized/infinite queries, provider dependencies, arbitrary hooks, nested navigation and theme migration still need additional adapters.
- Run signed bare iOS/Android builds, Maestro flows on the named matrix, VoiceOver/TalkBack, larger text, contrast and keyboard checks. Establish startup, memory, scrolling, bundle-size and layout-switch budgets on physical mid-range devices.
- Run the 60-request evaluation set with live providers and report semantic correctness separately from JSON validation. Do not claim the proposed 90% target before measurement.
- Choose a repository/security contact, publish packages under an owned npm scope, set up trusted publishing, create installation videos and release notes. Package names here are local and unclaimed.

No hosted vendor service, shared personalization database, telemetry collector or account system is needed to perform these steps. Release remains a maintainer decision after the evidence above.

Before publishing package changes, run `npm run test:consumer` to verify real tarball installation, the native template, generated UI interactions, both Metro bundles and the CLI lifecycle. This complements the workspace tests and does not replace native binary/device acceptance. See [fresh-app verification](fresh-app-verification.md).
