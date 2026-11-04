---
# PLACEHOLDER COPY: the user signs the assumption of liability document by
# typing their full name, shown below the box as a signature
type: signature
label: Type your full name
hint: This will be your signature.
errors:
  required: Enter your full name to sign the assumption of liability
# The checkbox under the signature, which must be ticked to sign
agreement:
  label: I agree to assume liability to pay the nature restoration levy for this development
  errors:
    required: Select that you agree to assume liability to pay the nature restoration levy
button: Sign
---

# Sign the assumption of liability

By signing, you become legally liable to pay the nature restoration levy of £{{ record.levyAmount }} for the development at {{ record.site }}.

:::if sharedLiability

You will be jointly liable with the other people named on the assumption of liability document.

:::

:::warning
Once you have signed, you cannot withdraw from this liability. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
:::
