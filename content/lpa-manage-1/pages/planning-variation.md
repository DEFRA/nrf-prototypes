---
# PLACEHOLDER COPY: the content designer has not written this page yet.
# Shown when the NRL reference typed already has a developer record.
type: radios
bodyFirst: true
options:
  - label: 'Yes'
    value: 'yes'
    hint: Enter the new planning application reference number for this commitment
  - label: 'No'
    value: 'no'
    hint: Go to the developer record you already have for this commitment
errors:
  required: Select yes if this is a planning variation
button: Continue
---

# Placeholder: Is this a planning variation?

::: inset
Placeholder: {{ commitment.reference }} is already in your developer records, for planning application {{ record.planningReference }}.
:::