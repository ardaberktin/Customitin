# Independent fresh React Native consumer

These host files are copied onto an official React Native 0.83.10 template by `npm run test:consumer`. SDK packages are installed from tarballs; no workspace aliases or symlinks are used. This is a regression fixture, not another maintained reference app.

The host has 35 local trails, a shared TanStack QueryClient, React Navigation details, an editable trip note and reusable components. Query completeness is confirmed by the test command's --complete flag. --component selects the card and greeting. --detail connects rows to the existing navigator. AsyncStorage is discovered automatically. No capabilities, adapters or root wrapper are hand-written.

Tests mock only native facilities and the planner transport; they render the actual generated root and SDK. The deterministic planner lives in test-support and is not imported by the app bundle. A native launch therefore demonstrates the offline controls, original app and welcome surface; collection-proposal flows run in the component interaction suite.

Run from the SDK checkout. The command downloads dependencies and leaves a fresh app plus logs in a printed temporary directory. It tests typecheck/lint, interactions, platform bundles, refresh, source moves, drift protection, removal and reinstall. Native binary/device checks are separate. Read docs/ai/testing.md for the full workflow.
