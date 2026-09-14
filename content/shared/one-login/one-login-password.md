---
# Mock GOV.UK One Login, step 2. Any password is accepted and nothing is
# stored: the field name starts with `_` so the kit never copies it into the
# session, and `remember: false` keeps the engine from doing so either.
type: password
layout: one-login
field: _password
remember: false
errors:
  required: Enter your password
button: Continue
---

# Enter your password

[I've forgotten my password](#)
