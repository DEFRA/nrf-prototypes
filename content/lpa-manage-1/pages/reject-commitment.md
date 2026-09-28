---
# Rejecting a developer record's commitment details, after choosing to
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
  - text: Back to developer record
    kind: link
    goto: view-record
text:
  commentLabel: Add a comment (optional)
  warning: Warning
  rejectWarning: If you reject the commitment details, you will not be able to change the status of this developer record.
---

# Why is this commitment being rejected?
