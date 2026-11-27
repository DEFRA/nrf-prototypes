---
type: radios
legend: What would you like to do?
# The email addresses sit between the heading and the options
bodyFirst: true
# `value` is what the journey branches on, so the labels can be reworded
# without touching journey.yaml
options:
  - label: Continue with {{ account.email }}
    value: continue
  - label: Use a different email address to sign in
    value: different-email
errors:
  required: Select if you want to continue with this email address
button: Continue
---

# Check your email address

The email address you have signed in with ({{ account.email }}) is different to the email address you used to get your quote ({{ retrievalEmail }}). 

Your commitment certificate will be sent to {{ account.email }}.