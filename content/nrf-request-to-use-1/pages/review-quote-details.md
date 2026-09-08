---
type: check-answers
rows:
  - key: Planning permission type
    value: '{{ planningType }}'
    change: planning-type
    changeHidden: planning permission type
  - key: Housing
    value: '{{ isHousing }}'
    change: housing
    changeHidden: whether you are developing housing
  - key: Number of housing units
    value: '{{ residentialBuildingCount }}'
    change: units
    changeHidden: number of housing units
  - key: Red line boundary
    value:
      when: { key: redlineBoundaryPolygon, truthy: true }
      then: Added
      else: Not added
    change: map
    changeHidden: red line boundary
  - key: Email address
    value: '{{ estimateEmail }}'
    change: email
    changeHidden: email address
actions:
  - text: Continue
    kind: submit
  - text: Delete
    kind: destructive
    goto: delete-quote
    hidden: quote details
---

# Review and amend your quote details

Update the details of your development to match your planning application. Changes may result in a recalculation of available capacity and the levy amount.
