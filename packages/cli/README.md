# @customitin/cli

Development-time discovery and provider-only integration for the Customitin headless SDK. Supports native/Expo and Vite first; other React roots use manual placement. No theme, navigation, editor, chat or empty screen is installed.

Run `customitin inspect` for the readable report or `inspect --json` for locations, usage, compatibility evidence and `review.digest`. Approve with `init --approve-report DIGEST --exclude ID_OR_SELECTOR --dry-run`, then `--apply`. Individual source/component/screen/route selections remain explicit. Refresh keeps new discoveries pending.

The CLI follows reachable local workspace imports/aliases/re-exports, generates supported typed adapters and reports adapter exceptions. It never infers authorization, complete data or mutation semantics. Doctor verifies static installation/types; runtime/device verification is separate.

Config and overrides belong to the developer; generated files retain drift protection. Stable identity history survives moves and removal. Recognized Vite/Expo/Metro scripts start the watcher with the app. See `guide --topic integration`, `guide --topic maintenance`, and `schema` for exact contracts. Packages remain locally distributed.
