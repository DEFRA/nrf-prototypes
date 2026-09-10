---
type: check-answers
rows:
  - key: Planning application type
    value: '{{ planningType }}'
    change: planning-type
    changeHidden: planning application type
  - key: Housing
    value: '{{ isHousing }}'
  - key: Number of units
    value: '{{ residentialBuildingCount }}'
    change: units
    changeHidden: number of units
  - key: Red line boundary
    # Production shows the uploaded file's name, or "Added" for a drawn boundary
    value:
      when: { key: hasRedlineBoundaryFile, truthy: true }
      then: '{{ redlineFile or "Uploaded" }}'
      else: Added
    change:
      - when: { key: hasRedlineBoundaryFile, truthy: true }
        goto: file-preview
      - goto: map
    changeHidden:
      when: { key: hasRedlineBoundaryFile, truthy: true }
      then: uploaded red line boundary
      else: drawn red line boundary
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

You will receive an indicative nature restoration levy quote, based on the details you provided. For the purposes of section 72 of the Planning and Infrastructure Act 2025, this quote will not commit you to pay the nature restoration levy and will not disapply any relevant environmental obligations. A local planning authority must not accept this quote as part of any planning and decision-making processes.
