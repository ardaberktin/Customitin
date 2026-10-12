# Pinned alpha compatibility

| Tool                                   | Version                               |
| -------------------------------------- | ------------------------------------- |
| Node                                   | 24.15.0 tested; package floor 22.13.0 |
| TypeScript                             | 5.9.3                                 |
| React                                  | 19.2.0                                |
| React Native                           | 0.83.10                               |
| React Native CLI                       | 20.2.0                                |
| Expo                                   | 55.0.31                               |
| Expo Router                            | 55.0.18                               |
| React Navigation native / tabs / stack | 7.5.0 / 7.20.0 / 7.20.0               |
| AsyncStorage                           | 2.2.0                                 |
| Zod                                    | 4.1.13                                |
| ts-morph                               | 27.0.2                                |
| TanStack Query                         | 5.90.12 (examples only)               |
| Vitest                                 | 4.1.11                                |
| Playwright                             | 1.57.0                                |
| Provider SDK                           | none; server-only REST adapters       |

The exact lockfile pins transitive dependencies. The CLI never upgrades the consuming application. SDK 55 was chosen deliberately as a versioned compatibility baseline; no claim is made for every Expo/RN version. The React Native SDK has no Expo Router, provider, CLI, database or query-cache dependency. Optional exports isolate HTTP, storage and navigation contracts.

Upstream version references: [Expo SDK 55 matrix](https://docs.expo.dev/versions/v55.0.0/), [SDK 55 Router](https://docs.expo.dev/versions/v55.0.0/sdk/router/), [React Navigation 7 setup](https://reactnavigation.org/docs/7.x/getting-started/), [ts-morph manipulation](https://ts-morph.com/manipulation/). Expo UI was evaluated; the SDK intentionally uses framework-neutral React Native primitives so bare consumers do not require Expo. SDK 55 also predates the universal Expo UI layer.

CI builds and tests the pinned versions. Physical-device performance, VoiceOver/TalkBack, larger system text and native app-store binaries require the device release checklist. Browser interaction coverage is useful, but does not substitute for those checks.
