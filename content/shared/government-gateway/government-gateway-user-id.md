---
# Mock Government Gateway, last create step. The journey's hook mints the
# user ID when the page opens and signs the user in when they continue.
type: confirmation
layout: government-gateway
title: Your Government Gateway user ID
panel:
  title: 'Your Government Gateway user ID is:'
  body: '{{ governmentGatewayUserId }}'
actions:
  - text: Continue
    kind: submit
---

We have sent it to **{{ signInEmail }}**.

You will need your user ID and your password each time you sign in to Government Gateway.

**Never share your Government Gateway user ID or password with anyone else.**

:::after-button

[Get help with this page](#)

:::
