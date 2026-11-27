---
# Rejecting a commitment's details, after choosing to
# reject them on the record page (app/views/lpa-manage-1/reject-commitment.html).
# The reason is required, the comment below it is not. Rejecting is final.
type: radios
options:
  - label: Details are incorrect
    value: incorrect
  - label: Commitment doesn't match the planning application
    value: mismatch
errors:
  required: Select why this commitment is being rejected
button: Confirm
actions:
  - text: Back to commitment
    kind: link
    goto: view-record
text:
  commentLabel: Add a comment (optional)
  warning: Warning
  rejectWarning: If you reject the commitment, you will not be able to change the status of this commitment.
---

# Why is this commitment being rejected?
