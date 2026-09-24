---
# Every detail of a record's commitment
# (app/views/lpa-manage-1/certificate.html), opened from "View full
# certificate" on the record page: certificate?ref=NRL-123456. The
# breadcrumbs lead back to the dashboard and the record.
type: custom
caption: '{{ commitment.reference }}'
rows:
  - include: commitment-summary
  - include: commitment-terms
text:
  breadcrumbDashboard: Dashboard
  backToRecord: Back to record
---

# Commitment certificate

## Red line boundary

:::map commitment.boundary os
:::
