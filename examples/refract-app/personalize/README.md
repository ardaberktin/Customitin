# Headless Customitin integration

The provider adds no visible UI, route, theme, or controls. Mount SurfaceRenderer inside a host-owned screen or use the generated existing-screen region bindings. Build your own assistant and confirmation UI with useAssistant/useAction.

Review discovery.json for found, bindable, and enabled capabilities. Generated bindings do not establish business semantics, authorization, or native-device verification. Edit overrides.json for surface permissions and config.ts for host storage, session, actions and custom adapters. These two files are developer-owned. Keep bindings.lock.json for stable identities.

Keep using the app's development command for automatic checks. Newly discovered capabilities remain pending approval. Run inspect, review the digest, and explicitly approve additions. Run doctor --typecheck and host interaction/bundle checks before release. Deploy matching server-manifest.json with the authenticated planner.
