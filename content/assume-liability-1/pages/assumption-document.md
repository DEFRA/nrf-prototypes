---
type: custom
button: Continue
text:
  # Below the signatures: back to the list of jointly liable people (Remove
  # and Add another person), or to "Is there anyone else...?" when nobody
  # else is listed
  changePeople: Change who is jointly liable
  addPeople: Add someone who is jointly liable
  caption: '{reference}'
  signaturesHeading: Jointly liable people
  columns:
    name: Name
    organisation: Organisation
    email: Email address
    status: Status
    actions: Action
    # In place of Action once everyone has signed: the date each signed
    date: Date
  you: (you)
  signed: Signed
  # Until the user has signed: the button to the signing page
  continueToSign: Sign the assumption of liability
  # The main liable person's Remind links (their column's heading is only
  # for screen readers); the hidden words finish the link, {name} is the
  # person
  remind: Remind
  remindHidden: '{name}'
  # PLACEHOLDER: after a Remind link; {name} is the person reminded
  reminderSent: We have sent a reminder to {name}.
  # PLACEHOLDER: back from the signing page, once the user has signed
  youSigned: You have signed the assumption of liability document.
  # {count} is the number of people still to sign
  waitingOne: We are waiting for 1 person to sign.
  waitingMany: We are waiting for {count} people to sign.
  # After the waiting message, for the primary user only
  paymentAfter: You can add the payment details once everyone has signed.
  # A secondary user once everyone has signed; {name} is the primary user
  allSignedSecondary: Everyone has signed. {name} will add the payment details.
  back: Return to manage the nature restoration levy
---

# Assumption of liability

The amount of the levy may have changed since your commitment. The charging schedule may have been updated or inflation might have been applied.

## Details of the Environmental Delivery Plan (EDP)

Your relevant development is planned in: {{ record.edp }}.

## Total levy amounts

### Provisional nature restoration levy amount: £{{ record.levyAmount }} (excluding VAT)

The provisional amount is calculated from the charging schedule in the relevant EDP.

### Inflation-adjusted nature restoration levy amount: £{{ record.levyAmount }} (excluding VAT)

The inflation-adjusted amount shows the indicative levy amount for the year this commitment was issued.

:::if howToPay notEquals instalments
Inflation adjustments will continue to apply until the total levy amount has been paid.
:::

:::if howToPay equals instalments
Inflation adjustments will continue to apply until the total levy amount has been paid, including on all instalments.

## Instalment amounts

If you confirm you want to pay in intstalments, your payment will be made up of 3 instalments.

### Provisional nature restoration levy instalment amount: £{{ record.levyAmount }} (excluding VAT)

### Inflation-adjusted nature restoration levy instalment amount: £{{ record.levyAmount }} (excluding VAT)
:::

:::details How the nature restoration levy was calculated
The levy has been calculated from the details you submitted and the charging schedule for the relevant EDP. [Read about the charging schedule for the EDP (opens in new tab)](#).
:::
