# Packed consumer verification

## Headless native and Vite consumers — October 16, 2026

`npm run test:consumer` builds and packs all five local SDK packages, creates isolated apps from [the native fixture](../fixtures/headless-native) and [the Vite fixture](../fixtures/headless-web), and installs actual tarballs with their pinned peers. It verifies that installed package paths are inside each temporary app, not workspace aliases. The current fixtures are intentionally small headless consumers, not full official-template native binary builds.

Both consumers passed:

- Packaged CLI inspection and explicit approval against the report digest.
- Provider-only setup with two reusable components and one reviewed source; no generated surfaces, appearance tokens or navigation destinations.
- Strict consumer TypeScript, static doctor verification and an unchanged refresh.
- A separate explicit `--screen App.tsx#default` refresh, followed by compiling and bundling the generated native/DOM section integration.
- ESM imports of main React and platform storage/HTTP adapter exports.
- A Vite production build and native production JavaScript bundles for iOS and Android using the fixture's Metro/Babel configuration.
- Reversible removal restoring the original entry file byte-for-byte and retaining developer config.

The final successful run retained evidence at `/var/folders/94/96sc1q_x7577ysgkqy4m_0t40000gn/T/customitin-packed-K6JQnV/artifacts`. That directory contains tarballs, CLI JSON, typecheck logs, export smoke logs and platform bundles. Temporary files may be removed by system cleanup; committed fixtures and [the runner](../scripts/consumer/run.mjs) are the durable reproduction.

```sh
npm ci
npm run check
npm run test:consumer
```

The fixture installation uses npm's offline cache. A fresh environment must first make the pinned peer dependencies and their transitive dependencies available in that cache. This run used an already populated cache and did not contact a package registry. Local tarballs remain unpublished.

These checks establish package/CLI/type/bundle behavior. The separate five-flow browser suite exercises developer-owned controls; neither establishes physical-device interaction, accessibility, performance, live-model quality or production backend authorization. Hosts still place their UI and surfaces, resolve reported adapters, supply scoped persistence/session bindings, implement authenticated planner/data/action services with durable mutation idempotency, and deploy matching manifests. See [integration](ai/integration.md) and [testing](ai/testing.md).

## Historical official-template verification — October 12, 2026

The record below describes the former styled-shell SDK. Its installation commands and native simulator results are preserved as historical evidence, not instructions or device acceptance for headless v2. The historical fixture remains under `fixtures/fresh-react-native`; the current packed runner uses the two headless fixtures above.

Recorded October 12, 2026. Started with the AI integration guides and an official React Native 0.83.10 template, installed locally packed SDK artifacts, and used the packaged CLI from inside the independent app. The initial integration did not copy an existing SDK example or use workspace aliases. SDK implementation files were inspected after consumer failures were reproduced so the failures could be repaired.

## Consumer and connected behavior

The independent app contains 35 local trails, an exported TanStack query-options factory and its existing QueryClient, a custom TrailCard, a Greeting requiring QueryClientProvider, a React Navigation ref/ParamList, an existing detail screen and an editable trip note. AsyncStorage is installed as a normal host dependency.

Integration uses only these semantic selections:

```sh
npx --no-install customitin init \
  --complete 'src/trails.ts#trailOptions' \
  --component 'src/TrailCard.tsx#TrailCard' \
  --component 'src/TrailCard.tsx#Greeting' \
  --detail 'src/trails.ts#trailOptions=src/navigation.ts#RootParamList.Trail' \
  --apply
```

A dry-run precedes apply in the regression. Capabilities, source/query adapters, component wrappers, detail navigation, storage selection, root integration and safe-area wiring are generated. No registry or adapter is hand-written. The complete-source flag is justified because the fixture returns all 35 authorized local rows, not because its return type is an array.

## Findings fixed

| Consumer finding                                                                    | Resulting change                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standard native Jest could not parse the SDK source export                          | Native package conditions now point to built CommonJS; consumers need no Customitin transform exception                                                    |
| Stock Metro failed on a transitive Zod export namespace                             | Native CommonJS resolution also uses Zod's compatible CommonJS path; no SDK-specific Babel plugin is needed                                                |
| Query context lived below the generated personal shell                              | The root transform preserves visible outer provider chains; the custom Greeting now runs under the original QueryClientProvider                            |
| Native content overlapped the status area after apply/scroll                        | The generated root connects installed safe-area-context; shell insets and theme background are handled explicitly                                          |
| Generated bracket property access produced host ESLint warnings                     | Valid identifier properties use dot access, including repository members                                                                                   |
| Generated TypeScript was dense and unsuitable for host formatting checks            | Generation formats code with portable static host settings before recording ownership; host JS configs/plugins are not executed                            |
| Doctor treated offline/local-device usage as a failed integration                   | Optional planner/account guidance is returned as recommendations; missing dependencies/storage and real integration errors remain issues                   |
| Detail mapping required hand-editing JSON                                           | Repeatable --detail SOURCE=ROUTE records the mapping and enables its route                                                                                 |
| Removing an installation discarded identity history still used by durable overrides | Removal retains bindings.lock.json; moved selector overrides work after reinstall                                                                          |
| A typo could be accepted as a CLI selection                                         | Unknown selectors fail before writing; integration issues produce a nonzero CLI exit                                                                       |
| Tarball guides omitted the CLI's unpublished server dependency and test setup       | pack:local prints exact runtime/dev install commands; the bundled testing guide supplies native mocks, deterministic proposal examples and platform checks |

## Verification performed

- `npm run check`: 58 tests across 12 files; strict TypeScript; ESLint with zero warnings; formatting; all four ESM/CommonJS/declaration builds; mobile boundaries; AI-doc bundle freshness.
- `npm run test:consumer`: an additional fresh official template, actual tarball dependencies and installed CLI; template installation/removal; inspect and dry-run; host typecheck and explicit TypeScript lint; three native component interaction tests; iOS and Android production Metro bundles with unchanged template Babel/Metro configs.
- The same fresh-app regression verifies no-op refresh, stable IDs and manifest revision after a source move, interactions after that move, refusal to overwrite/remove drift, preservation of config/overrides/identity history, and successful reinstall/doctor.
- Component interactions cover full-data filtering/sorting (Trail 35 appears first, beyond the first 30 input rows), host provider context, native navigation, original trip-note preservation, cache invalidation, profile persistence, scope switching, offline preferences, undo and reset.
- Existing cross-app Playwright regressions: all three passed. The first recipe attempt reached the temporary native Metro server on the same port; that process was stopped and all tests reran with dedicated servers (`CI=1`).
- iOS native binary: the independent app built on Xcode 27 for the iOS 26.5 simulator. The build used `IPHONEOS_DEPLOYMENT_TARGET=15.1` because the pinned AsyncStorage resource pod's 13.4 default is below this Xcode's supported simulator floor.
- Interactive simulator checks: original app and Customize, manual theme preview/apply, theme restoration after process restart, undo, safe-area layout and hidden original content. A temporary deterministic test planner then exercised a filtered collection, the host Greeting/card, row-to-existing-detail navigation and immediate refresh after the host's Rename trail action. The test planner was removed afterward; the saved collection remained usable without it.

The deterministic planner did not call a model provider. The native app uses local fixture data and a device scope; no real account authorization or backend deployment is claimed. Android native compilation/interaction, physical-device performance, complete VoiceOver/TalkBack testing and signed releases remain unverified. Native dependency/template warnings (including deprecation documentation and the template's unused empty location-description entry) are distinct from the clean SDK/consumer TypeScript and ESLint results. No SDK package was published.

## Reproduce and inspect

```sh
npm ci
npm run check
npm run test:consumer
```

The fresh consumer command prints its temporary app/evidence directories and retains CLI JSON, type/lint/test logs and platform bundles. The automated fixture is [fixtures/fresh-react-native](../fixtures/fresh-react-native/README.md); the public instructions are [the AI testing guide](ai/testing.md). The CLI bundles that guide as `customitin guide --topic testing`.

This run's final fresh consumer was created under `/var/folders/94/96sc1q_x7577ysgkqy4m_0t40000gn/T/customitin-fresh-mL7nkB`, with `app` and `artifacts` subdirectories. The native simulator consumer and logs are at `/private/tmp/customitin-fresh-rn` and `/private/tmp/customitin-fresh-artifacts`. Temporary paths can disappear during system cleanup; the committed fixture and scripts are the durable reproduction.

For an actual app, the remaining developer decisions are which data is complete/authorized, which fields/components/routes may be exposed, and the app's account scope when it has login. A production natural-language planner additionally needs a developer-owned endpoint/authentication and matching server manifest. See [integration](ai/integration.md) and [testing](ai/testing.md); ordinary offline appearance customization needs no planner.
