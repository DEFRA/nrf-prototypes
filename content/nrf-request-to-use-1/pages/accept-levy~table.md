---
# A copy variant of accept-levy.md: the levy details as a table instead of
# prose (see content/README.md, "Trying out variations of a page").
variant: Table
type: radios
# The levy details sit between the question and the options
bodyFirst: true
options:
  - label: Yes, accept this amount
    value: 'Yes'
  - label: No, delete my quote details
    value: 'No'
errors:
  required: Select yes if you accept your nature restoration levy amount
button: Continue
---

# Do you accept your nature restoration levy amount?

## Details of your levy amount

| Levy amount            | Amount (excluding VAT) | How it is worked out                                                |
| ---------------------- | ---------------------: | ------------------------------------------------------------------- |
| **Provisional**        |      £{{ levyAmount }} | Calculated from the charging schedule in the relevant EDP(s).       |
| **Inflation-adjusted** |      £{{ levyAmount }} | The indicative levy amount for the year this commitment was issued. |

:::details How the nature restoration levy was calculated
The levy has been calculated from the details you submitted and the charging schedule for the relevant EDP(s). [Read about the charging schedule for the EDP (opens in new tab)](#).
:::
