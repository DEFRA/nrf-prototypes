---
# A developer record (app/views/assume-liability-1/developer-record.html).
# The heading is the record's NRL reference with its status. The question
# at the bottom shows only to the primary user of a record whose planning
# permission is granted; everyone else sees one of the `text:` messages in
# its place. A secondary user named as jointly liable is sent to the
# assumption document to sign it.
type: radios
rows:
  - heading: Levy
  - key: Levy amount
    value: '£{{ record.levyAmount }}'
  - key: Environmental Delivery Plan
    value: '{{ record.edp }}'
  - heading: Development details
  - key: Development
    value: '{{ record.site }}'
  - key: Planning application reference
    value: '{{ record.planningReference }}'
  - key: Planning type
    value: '{{ record.planningType }}'
  - key: Number of units
    value: '{{ record.units }}'
  - key: Local planning authority
    value: '{{ record.lpa }}'
  - key: Planning permission granted
    value: '{{ record.permissionGranted }}'
    when: { key: record.permissionGranted, truthy: true }
  - heading: Developer details
  - key: Developer
    value: '{{ record.developer }}'
  - key: Primary user
    value: '{{ record.primaryUser }}'
  - key: Liability assumed
    value: '{{ record.liabilityAssumed }}'
    when: { key: record.status.value, equals: liable }
options:
  - label: 'Yes'
    value: 'yes'
  - label: No, do this later
    value: later
  - label: No, Someone else needs to assume liability
    value: someone-else
errors:
  required: Select if you are ready to assume liability to pay the nature restoration levy
button: Continue
text:
  question: Are you ready to assume liability to pay the nature restoration levy?
  # In place of the question; {name} is the primary user
  secondary: '{name} is the primary user for this developer record. Only they can assume liability to pay the nature restoration levy.'
  awaitingPermission: You can assume liability to pay the nature restoration levy once planning permission has been granted.
  # A secondary user named as jointly liable, before they sign; {name} is
  # the primary user
  named: '{name} has named you as jointly liable to pay the nature restoration levy for this development. Read and sign the assumption of liability document.'
  signatures: The assumption of liability document is waiting for signatures.
  signed: Everyone has signed the assumption of liability document. {name} will add the payment details.
  viewDocument: View the assumption of liability document
  liable: Liability to pay the nature restoration levy has been assumed for this development.
  back: Return to manage the nature restoration levy
---

# {{ record.reference }}

## Red line boundary

:::map record.boundary
:::
