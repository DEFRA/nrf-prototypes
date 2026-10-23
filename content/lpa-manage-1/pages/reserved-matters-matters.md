---
# The options' values are the reserved matters in records.yaml, which
# label them on the record page. Layout or scale asks for the number of
# units next (journey.yaml).
type: checkboxes
caption: '{{ reservedMattersRecord }}'
hint: Select all that apply.
options:
  - label: Access
    value: access
  - label: Appearance
    value: appearance
  - label: Landscaping
    value: landscaping
  - label: Layout
    value: layout
  - label: Scale
    value: scale
errors:
  # PLACEHOLDER COPY: no matter ticked
  required: Select the reserved matters this application is for
button: Continue
---

# Which reserved matters is this application for?
