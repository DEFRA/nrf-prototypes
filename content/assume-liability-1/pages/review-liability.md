---
# The details to submit (app/views/assume-liability-1/review-liability.html):
# the rows below, then everyone liable: a table when others are jointly
# liable, the user's own details when it is them alone
type: check-answers
rows:
  - heading: Development
  - key: NRL reference
    value: '{{ record.reference }}'
  - key: Development
    value: '{{ record.site }}'
  - key: Levy amount
    value: '£{{ record.levyAmount }}'
  - heading: Payment
  - key: How you will pay
    value: '{{ howToPay }}'
    change: how-to-pay
    changeHidden: how you will pay
  - key: Paid by
    value: '{{ payerDetails.payerName }}'
    change: add-payment-details
    changeHidden: who is paying
  - key: Business name
    value: '{{ payerDetails.businessName }}'
    change: add-payment-details
    changeHidden: business name
  - key: Address
    value:
      lines:
        - '{{ payerDetails.addressLine1 }}'
        - '{{ payerDetails.addressLine2 }}'
        - '{{ payerDetails.town }}'
        - '{{ payerDetails.postcode }}'
    change: add-payment-details
    changeHidden: payment address
  - key: Company Registration Number (CRN)
    value: '{{ payerDetails.companyRegistrationNumber or "Not provided" }}'
    change: add-payment-details
    changeHidden: Company Registration Number
  - key: VAT registration number
    value: '{{ payerDetails.vatRegistrationNumber or "Not provided" }}'
    change: add-payment-details
    changeHidden: VAT registration number
  - key: Purchase order number
    value: '{{ payerDetails.purchaseOrderNumber or "Not provided" }}'
    change: add-payment-details
    changeHidden: purchase order number
actions:
  - text: Confirm and submit
    kind: submit
text:
  peopleHeading: Jointly liable people
  youHeading: Your details
  columns:
    name: Name
    organisation: Organisation
    email: Email address
    signed: Signed
  you: (you)
  fullName: Name
  organisation: Organisation
  email: Email address
  signed: Signed
---

# Review liability and payment details

