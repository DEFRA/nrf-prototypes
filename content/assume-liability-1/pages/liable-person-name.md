---
# The name page of each jointly liable person
# (app/views/assume-liability-1/liable-person-name.html): their full name,
# whether they are part of the signed-in user's organisation and, when they
# are not, their organisation's name (required then; see
# app/lib/assume-liability-1/hooks.js)
type: form
hint: You will be able to add others later if there is more than one.
fields:
  - name: full-name
    label: Full name
    errors:
      required: Enter their full name
  # Its answers are the page's `options` below
  - name: same-organisation
    label: Is this person also part of {{ account.organisationName }}?
    errors:
      required: Select yes if this person is also part of {{ account.organisationName }}
  # Shown when they are not part of the user's organisation, and required then
  - name: organisation
    label: Organisation name
    optional: true
    errors:
      required: Enter the name of their organisation
# The answers to "Is this person also part of...?"; No reveals the
# organisation's name
options:
  - label: 'Yes'
    value: 'yes'
  - label: 'No'
    value: 'no'
button: Continue
---

# Add details for another liable person
