---
type: checkboxes
bodyFirst: true
options:
  - label: I declare that I agree to assume liability to pay the nature restoration levy charged unde Part 3 of the Planning and Infrastructure Act 2025 on the selected payment terms. I acknowledge that when assuming liability, these payment terms cannot be amended. I am aware of the surcharges that will be imposed and the interest that will accrue if the correct procedures for paying the nature restoration levy are not followed. 
    value: agree
errors:
  required: Select that you agree to assume liability to pay the nature restoration levy
button: Confirm
# The box around the checkbox and the details under it
# (app/views/assume-liability-1/sign-assumption.html)
text:
  signatureTitle: Your signature
  signatureLead: By checking the box, you become legally liable to pay the nature restoration levy
  signatureNote: When you tick this box and select 'Confirm' you are legally signing the assumption of liability.
  details:
    summary: How ticking the box acts as your legal signature
    paragraphs:
      - Electronic signatures are legally recognised in England and Wales. They make it easier for you to sign documents online.
      - By ticking the box and selecting 'Confirm', you are providing your legal signature. This is just as safe and legally binding as signing the assumption of liability by hand.
---

# Sign the assumption of liability

By signing, you become legally liable to pay the nature restoration levy of £{{ record.levyAmount }} for the development at {{ record.site }}.

:::if sharedLiability

You will be jointly liable with the other people named on the assumption of liability document.

:::

:::warning
The assumption of liability notice is not complete until all liable persons have signed. 
:::
