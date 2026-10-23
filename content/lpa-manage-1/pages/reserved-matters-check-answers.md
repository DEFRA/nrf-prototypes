---
# Save adds the reserved matters application to the developer record and
# returns to it, which says so (hooks.js)
type: check-answers
caption: '{{ reservedMattersRecord }}'
rows:
  - key: Planning application reference
    value: '{{ reservedMattersReference }}'
    change: reserved-matters-reference
    changeHidden: planning application reference
  - key: Reserved matters
    value: '{{ reservedMattersMatters | list | lower | capitalize }}'
    change: reserved-matters-matters
    changeHidden: reserved matters
  - key: Number of units
    value: '{{ reservedMattersUnits }}'
    when: { key: reservedMattersMatters, includes: [layout, scale] }
    change: reserved-matters-units
    changeHidden: number of units
  - key: Description
    value: '{{ reservedMattersDescription }}'
    change: reserved-matters-description
    changeHidden: description
actions:
  - text: Save
    kind: submit
  - text: Cancel
    kind: link
    goto: view-record
---

# Check the reserved matters application details
