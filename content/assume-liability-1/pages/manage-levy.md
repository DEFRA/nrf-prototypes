---
# The account's home (app/views/assume-liability-1/manage-levy.html): every
# developer record the user is a primary or secondary user of, from
# records.yaml, each NRL reference linking to the record; then their quotes
# and commitments, each with a link to use it.
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
  primary: Main liable person
  secondary: Other liable person
  # The quotes and commitments under the records (records.yaml)
  otherCaption: Your quotes and commitments
  otherColumns:
    reference: NRL reference
    site: Development
    type: Type
    date: Date
    # Only for screen readers
    action: Action
  types:
    quote: Quote
    commitment: Commitment
  requestToUse: Request to use the nature restoration levy
  viewCertificate: View commitment certificate
  # Finishes each link for screen readers; {reference} is the NRL reference
  linkHidden: for {reference}
---

# Manage the nature restoration levy
