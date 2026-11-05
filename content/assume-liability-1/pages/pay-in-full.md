---
# For a levy under £25,000, which cannot be paid in instalments: the same
# terms as one-off-payment-details, agreed with a single checkbox. The
# words below the heading are copied from that page, so change both.
type: checkboxes
# The levy details sit between the heading and the checkbox
bodyFirst: true
options:
  - label: Yes, I agree with these payment terms and will pay in full
    value: agree
errors:
  required: Select that you agree with these payment terms and will pay in full
button: Confirm
---

# Confirm these payment terms

The amount of the levy may have changed since your commitment. The charging schedule may have been updated or inflation might have been applied.

## Details of the Environmental Delivery Plan (EDP)

Your relevant development is planned in: {{ record.edp }}.

## Total levy amounts

### Provisional nature restoration levy amount: £{{ record.levyAmount }} (excluding VAT)

The provisional amount is calculated from the charging schedule in the relevant EDP.

### Inflation-adjusted nature restoration levy amount: £{{ record.levyAmount }} (excluding VAT)

The inflation-adjusted amount shows the indicative levy amount for the year this commitment was issued.

Inflation adjustments will continue to apply until the total levy amount has been paid.

:::details How the nature restoration levy was calculated
The levy has been calculated from the details you submitted and the charging schedule for the relevant EDP. [Read about the charging schedule for the EDP (opens in new tab)](#).
:::
