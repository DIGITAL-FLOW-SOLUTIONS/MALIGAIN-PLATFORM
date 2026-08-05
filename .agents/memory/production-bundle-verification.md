---
name: Production bundle verification
description: Confirm the live static bundle contains the latest auth fix before debugging production behavior
---

For static frontends deployed separately from the API, verify the live HTML asset hash and compiled behavior before assuming source changes are deployed. A healthy API and correct CORS headers do not mean the frontend bundle is current.

**Why:** The production site can continue serving an older cached/deployed JavaScript bundle, making a fixed authentication issue appear unresolved while development uses current source.

**How to apply:** Compare the live asset reference and compiled markers with the current local build after each auth fix, then republish the affected static frontend and retest in a fresh session.