---
# PLACEHOLDER FIELDS: who pays and where invoices go
type: form
hint: Enter the payment details for the person or organisation paying for the nature restoration levy.
fields:
  - name: payer-name
    label: Full name
    errors:
      required: Enter the name of the person or organisation paying
  - name: business-name
    label: Business name
    autocomplete: organization
    errors:
      required: Enter the business name
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
  - name: company-registration-number
    label: Company Registration Number (CRN)
    optional: true
  - name: vat-registration-number
    label: VAT registration number
    optional: true
  - name: purchase-order-number
    label: Purchase order number
    optional: true
button: Continue
---

# Add payment details
