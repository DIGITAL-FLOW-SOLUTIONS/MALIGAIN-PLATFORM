---
name: Third-party payment widget DOM
description: HashPay injects checkout modal content after opening, so vendor-only UI changes require a scoped runtime DOM strategy.
---

HashPay checkout controls and footer text are injected dynamically by the vendor script rather than rendered by the app.

**Why:** The payment widget owns its modal markup, so deleting a JSX element or searching only the source tree cannot change vendor-injected UI.

**How to apply:** For vendor-only presentation changes, use a narrowly scoped observer under the widget modal, match the exact intended text, and avoid modifying the overlay or payment form.