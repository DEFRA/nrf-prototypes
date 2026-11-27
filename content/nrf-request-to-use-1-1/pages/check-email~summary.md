---
variant: Summary list
description: The two email addresses in a summary list, with where the certificate goes as a hint on Continue
type: radios
legend: What would you like to do?
# The two email addresses, between the heading and the options
rows:
  - key: Signed in as
    value: '{{ account.email }}'
  - key: Quote requested with
    value: '{{ retrievalEmail }}'
options:
  - label: Continue as {{ account.email }}
    value: continue
    hint: Your commitment certificate will be sent to this email address
  - label: Use a different email address to sign in
    value: different-email
errors:
  required: Select if you want to continue with this email address
button: Continue
---

# You’re signed in with a different email address
