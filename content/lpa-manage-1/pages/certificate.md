---
# Every detail of a record's commitment
# (app/views/lpa-manage-1/certificate.html), opened from "View full
# certificate" on the record page: certificate?ref=NRL-123456. The
# breadcrumbs lead back to the dashboard and the developer record.
type: custom
caption: '{{ commitment.reference }}'
rows:
  - include: commitment-summary
  - include: commitment-terms
text:
  breadcrumbDashboard: Developer records
  backToRecord: Back to developer record
---

# Commitment certificate

## Red line boundary

:::map commitment.boundary os
:::
