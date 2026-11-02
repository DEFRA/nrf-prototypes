---
# PLACEHOLDER FIELDS: who pays and where invoices go
type: form
hint: Enter the payment details for the nature restoration levy.
fields:
  - name: payer-name
    label: Name of the person or organisation paying
    errors:
      required: Enter the name of the person or organisation paying
  - name: email
    label: Email address
    type: email
    autocomplete: email
    hint: We will send payment reminders and receipts to this address.
    errors:
      required: Enter an email address
  - name: address-line-1
    label: Address line 1
    autocomplete: address-line1
    errors:
      required: Enter address line 1
  - name: address-line-2
    label: Address line 2
    autocomplete: address-line2
    optional: true
  - name: town
    label: Town or city
    width: two-thirds
    autocomplete: address-level2
    errors:
      required: Enter a town or city
  - name: postcode
    label: Postcode
    width: 10
    autocomplete: postal-code
    errors:
      required: Enter a postcode
button: Continue
---

# Add payment details
