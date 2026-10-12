# Security policy

This is an experimental alpha. Do not publish credentials or user data in issues. Once this project has a GitHub remote, enable private vulnerability reporting before publication and publish the maintainer's security contact. No fictitious reporting address is supplied here.

Security boundaries: untrusted configuration cannot execute code; capability validation is independent of model instructions; identity comes from verified host sessions; provider keys remain on developer infrastructure; source adapters enforce host authorization; installer evidence is explicitly reviewed before transmission; local storage scope isolation is not encryption.

Do not expose the loopback demo server publicly. The production handler requires authentication and quota hooks. A deployment wrapper must add ingress/time limits, HTTPS and operational monitoring. No diagnostics are collected automatically.

Dependency advisories are recorded as an explicit release gate in docs/release-checklist.md; passing tests is not a claim that a dependency audit is clean.
