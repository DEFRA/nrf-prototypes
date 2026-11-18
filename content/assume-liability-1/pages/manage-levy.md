---
# The account's home (app/views/assume-liability-1/manage-levy.html): every
# developer record the user is a primary or secondary user of, from
# records.yaml, each NRL reference linking to the record; then their quotes
# and commitments, each NRL reference linking to its page.
type: custom
hint: View and manage your nature restoration levy quotes, commitments and liabilities to pay.
text:
  tableCaption: Your developer records
  columns:
    reference: NRL reference
    site: Development
    role: Your role
    lastUpdated: Last updated
    status: Status
  primary: Lead developer
  secondary: Developer
  # The quotes and commitments under the records (records.yaml)
  otherCaption: Your quotes and commitments
  otherColumns:
    reference: NRL reference
    site: Development
    type: Stage
    date: Date
    status: Status
  types:
    quote: Quote
    commitment: Commitment
  # PLACEHOLDER: each one's tag in the Status column. A commitment near its
  # expiry date (or past it) is `expiring` (or `expired`; records.yaml),
  # and one the user has cancelled `cancelled`
  statuses:
    active: Active
    expiring: Expires soon
    expired: Expired
    cancelled: Cancelled
---

# Manage the nature restoration levy
