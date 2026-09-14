---
# Mock Government Gateway, create step 4. The name becomes the mock
# account's name in the journey's hook.
type: input
layout: government-gateway
field: full-name
sessionKey: governmentGatewayName
width: 20
autocomplete: name
errors:
  required: Enter your full name
button: Continue
---

# What is your full name?

:::after-button

[Get help with this page](#)

:::
