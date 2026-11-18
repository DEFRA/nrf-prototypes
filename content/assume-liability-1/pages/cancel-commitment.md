---
# PLACEHOLDER COPY: why the developer is cancelling a commitment, with what
# cancelling means. The red button cancels it (hooks.js), so it leaves
# "Your quotes and commitments".
type: textarea
caption: '{{ commitment.reference }}'
hint: For example, the development is no longer going ahead or the planning application has been withdrawn.
lines: 5
maxLength: 1000
errors:
  required: Enter why you want to cancel this commitment
  tooLong: Reason must be 1,000 characters or fewer
actions:
  - text: Cancel commitment
    kind: warning
  - text: Do not cancel
    kind: link
    goto: commitment-details
---

# Why do you want to cancel this commitment?

:::warning
Cancelling this commitment cannot be undone. Your commitment certificate will no longer be valid and you cannot use it with your planning application.
:::
