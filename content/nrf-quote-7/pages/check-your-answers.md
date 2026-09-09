---
type: check-answers
rows:
  - key: Planning application type
    value: '{{ planningType }}'
    change: planning-type
    changeHidden: planning permission type
  - key: Housing
    value: '{{ isHousing }}'
  - key: Number of units
    value: '{{ residentialBuildingCount }}'
    change: units
    changeHidden: number of housing units
  - key: Red line boundary
    value:
      when: { key: redlineBoundaryPolygon, truthy: true }
      then: Added
      else: Not added
    change:
      - when: { key: hasRedlineBoundaryFile, truthy: true }
        goto: upload-redline
      - goto: map
    changeHidden: red line boundary
  - key: Email address
    value: '{{ estimateEmail }}'
    change: estimate-email
    changeHidden: email address
actions:
  - text: Confirm and submit
    kind: submit
  - text: Delete
    kind: destructive
    goto: delete-quote
    hidden: quote
---

# Check your answers

You will receive an indicative nature restoration levy quote, based on the details you provided. For the purposes of section 72 of the Planning and Infrastructure Act 2025, this quote will not commit you to pay the nature restoration levy and will not disapply any relevant environmental obligations. A Local Planning Authority must not accept this quote as part of any planning and decision-making processes.
