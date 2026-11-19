---
# The account's home (app/views/assume-liability-1/manage-levy.html): every
# developer record the user is a primary or secondary user of, from
# records.yaml, each NRL reference linking to the record; then their quotes
# and commitments, each NRL reference linking to its page.
type: custom
serviceName: Manage the nature restoration levy
hint: View and manage your nature restoration levy quotes, commitments and developer records. Access your commitment certificates to submit with your planning applications and view and manage developer records to assume liability to pay the levy.
text:
  tableHeading: View and manage your developer records
  tableIntro: Developer records are commitments with granted planning permission. Select a developer record to assume liability and pay the levy.
  columns:
    reference: NRL reference
    site: Development
    role: Your role
    lastUpdated: Last updated
    status: Status
  primary: Lead developer
  secondary: Developer
  # The quotes and commitments under the records (records.yaml)
  otherHeading: View and manage your quotes and commitments
  otherIntro: Select a quote to use it to request to use the nature restoration levy and turn it into a commitment. You can select and submit commitments with planning applications.
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

[Get a new quote](/nrf-quote-7-1/planning-type)
