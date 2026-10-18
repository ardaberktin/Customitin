# Native simulator pilot

This host-owned UI tests the packed SDK in an official React Native app, with real native views, Hermes and AsyncStorage. It includes a reusable chart, cards, a panel with child content, an editable heading, a third-party native slider wrapper, and existing keyed sections with input state and callbacks. The deterministic planner makes UI/runtime checks repeatable; it is not a live-model test.

## Create a fresh app

From the SDK repository, pack the packages and create the official template:

```sh
npm run pack:local -- /tmp/customitin-packages
npm exec --yes --package=@react-native-community/cli@20.2.0 -- rnc-cli init CustomitinPilot --version 0.83.10 --directory /tmp/customitin-native-pilot --skip-install --skip-git-init --pm npm
```

In `/tmp/customitin-native-pilot`, install the three runtime tarballs and both development tarballs using the exact commands printed by `pack:local`. Then install the host dependencies:

```sh
npm install --save-exact @react-native-async-storage/async-storage@2.2.0 react-native-safe-area-context@5.6.2 @react-native-community/slider@5.2.1
npm install --save-dev --save-exact typescript@5.9.3 @types/react@19.2.2
```

From the SDK repository:

```sh
node scripts/consumer/pilot.mjs /tmp/customitin-native-pilot
```

The script copies the host fixture, reviews only its intended components/loaders, checks dry-run/apply and generates the provider and section bindings. It configures a compose surface, a property surface and real AsyncStorage, then runs doctor and strict TypeScript. It refuses an already-installed app. Config/overrides are developer-owned; use normal `refresh --apply` after later host edits instead of rerunning setup.

## Build and run

Select a simulator UDID from `xcrun simctl list devices available`. The Podfile helper raises old dependency resource targets to React Native's iOS 15.1 minimum for Xcode 27 compatibility and declares intentional always-running bundle phases. It only edits this pilot's native build configuration.

In the fresh app:

```sh
npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0
LANG=en_US.UTF-8 pod install --project-directory=ios
xcodebuild -workspace ios/CustomitinPilot.xcworkspace -scheme CustomitinPilot -configuration Release -sdk iphonesimulator -destination 'id=YOUR_SIMULATOR_UDID' -derivedDataPath build CODE_SIGNING_ALLOWED=NO ONLY_ACTIVE_ARCH=YES
xcrun simctl install YOUR_SIMULATOR_UDID build/Build/Products/Release-iphonesimulator/CustomitinPilot.app
xcrun simctl launch YOUR_SIMULATOR_UDID org.reactjs.native.example.CustomitinPilot
```

Use a Release build so JavaScript is embedded and process-restart checks do not depend on Metro. Open the selected simulator in Xcode's simulator UI (Device Hub in Xcode 27).

## Interaction checks

1. Preview Hours chart; verify Design 8 / Engineering 16 and unchanged saved layout. Discard, preview again and apply.
2. Preview Budget chart; verify Design 120 / Engineering 240 with the same chart component and different source mapping. Apply. Terminate and launch the process, then undo. The prior hours layout should return.
3. Preview/apply Summary cards and Mixed components. Verify nested panel content and the actual native library slider. Reverse order and hide an item; discard/apply/undo and relaunch.
4. Change heading. Verify property preview, discard, apply and undo without changing its identity or structure.
5. Open Existing screen. Type a note and press Host action. Reorder/hide the keyed sections and discard/apply/undo; the mounted host input and callback state should survive. Confirm hidden content leaves the native accessibility tree. Check keyboard clearance and portrait/landscape layout.

Only SDK layout and mapped data plans persist across a process restart. This fixture's local note/counter intentionally use React state; durable host form state is the host's responsibility. Device accessibility, hardware performance, Android execution and live-model behavior require separate checks.
