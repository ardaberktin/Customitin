# Native pilot results — 2026-10-16

Environment: official React Native 0.83.10 template, React 19.2.0, Hermes, real AsyncStorage 2.2.0, native slider 5.2.1, Xcode 27.1 and an iOS 26.5 simulator. SDK packages were installed as tarballs in an isolated app. The Release binary embeds JavaScript and launches without Metro.

## Verified in the native app

| Check                  | Observed result                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chart reuse            | The same chart component/node displayed hours (Design 8, Engineering 16) and budgets (120, 240) through explicit mappings to differently named source fields.                                                                                                 |
| Preview isolation      | Budget preview showed the new values while the saved chart retained hours. Discard restored the previous display. Terminating an unapplied preview retained only the saved layout.                                                                            |
| Persistence and undo   | Applied budgets survived terminate/launch. Undo after relaunch restored hours, which survived another terminate/launch.                                                                                                                                       |
| General composition    | Summary cards, a panel with nested text, a chart and the actual native library slider rendered through generated bindings. Reorder/discard/apply and hide/apply worked. The composed layout with a hidden slider survived relaunch; undo restored the slider. |
| Property customization | Heading text/emphasis previewed, discarded, applied and undid without changing the surrounding layout.                                                                                                                                                        |
| Existing UI            | Generated keyed sections rendered after the context fix. A note and callback count survived hide/reorder/discard and hide/apply/undo. Hidden notes disappeared from the native accessibility tree.                                                            |
| Existing UI restart    | Saved section order and hidden notes survived a fresh terminate/launch. Undo after relaunch restored the notes in the saved order. The local note/counter reset, as expected for host React state.                                                            |
| Keyboard layout        | Before the host fix the keyboard covered the footer. Afterward Apply/Discard stayed above the keyboard; applying with the input focused worked.                                                                                                               |
| Rotation               | Landscape content scrolled to the input beneath the fixed footer. Preview controls remained above the landscape keyboard and Apply worked. Returning to portrait retained the composed workspace without a crash or layout regression.                        |

## Fixes prompted by the pilot

- Shared React native export conditions now select one module for ESM host imports and CommonJS native wrappers. Previously the native screen wrapper read a different context and crashed with `CustomizationProvider is missing`.
- The web DOM subpath now imports the public shared hook, avoiding a separately bundled context. Packed generated-screen rendering covers both platforms; native export identity and Metro source-map checks cover platform resolution.
- The host pilot uses keyboard avoidance, interactive keyboard dismissal and a Done return key. No screen styling or keyboard policy was added to SDK packages.
- The pilot's Podfile helper raises dependency resource deployment targets below the host's iOS 15.1 minimum, resolving an Xcode 27 build failure. Intentionally always-running bundle phases are declared explicitly.

## Limits

Automated verification passed: `npm run check` (124 tests), `npm run test:consumer` (isolated Vite/native installs, generated-screen rendering, iOS/Android Metro bundles and context identity), and `npm run test:e2e` (5 browser interactions). The fresh native app also passed doctor with typechecking and explicit TypeScript-aware ESLint.

The existing-section cold-start/undo and rotation checks were completed after the Mac was unlocked. No additional runtime or layout fix was required during that follow-up.

The note and counter use host React state, so their contents are not expected to survive a process restart. This pilot does not test live-model planning, a physical device, Android execution, screen-reader focus, large text or performance. Native build/runtime logs include upstream React Native/SocketRocket deprecation and empty-object warnings and simulator UIKit/haptics diagnostics; they were not suppressed. SDK/app TypeScript and lint checks pass without warnings.
