# Historical React Native consumer

These files describe an earlier integration on an official React Native 0.83.10 template. They are retained as historical reference and are **not** run by the current `npm run test:consumer`. The current headless acceptance runner uses `fixtures/headless-native`, `fixtures/headless-web` and `fixtures/headless-interactions`, installing SDK tarballs without workspace aliases or symlinks. See [the current verification guide](../../docs/ai/testing.md).

The host has 35 local trails, a shared TanStack QueryClient, React Navigation details, an editable trip note and reusable components. Query completeness is confirmed by the test command's --complete flag. --component selects the card and greeting. --detail connects rows to the existing navigator. AsyncStorage is discovered automatically. No capabilities, adapters or root wrapper are hand-written.

Tests mock only native facilities and the planner transport; they render the actual generated root and SDK. The deterministic planner lives in test-support and is not imported by the app bundle. A native launch therefore demonstrates the offline controls, original app and welcome surface; collection-proposal flows run in the component interaction suite.

The current runner leaves fresh apps and logs in a printed temporary directory. Its exact coverage and required native binary/device checks are documented in `docs/ai/testing.md`; the historical interactions in this folder are not current acceptance evidence.
