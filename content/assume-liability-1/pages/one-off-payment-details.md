---
type: radios
# The levy details sit between the question and the options
bodyFirst: true
options:
  - label: Yes, accept this amount and agree to pay a one-off payment
    value: 'Yes'
  - label: No, pay in instalments
    value: 'No'
errors:
  required: Select yes if you accept the nature restoration levy amount and will pay a one-off payment
button: Continue
---

# Do you accept this nature restoration levy amount?

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
