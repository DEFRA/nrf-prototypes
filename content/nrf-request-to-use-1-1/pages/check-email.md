---
type: radios
hint: You are using a different email address from the one you used when you got your quote.
# `value` is what the journey branches on, so the labels can be reworded
# without touching journey.yaml
options:
  - label: Continue with {{ account.email }}
    value: continue
  - label: Sign in again with a different email address
    value: different-email
errors:
  required: Select if you want to continue with this email address
button: Continue
---

# You have updated your email address
