---
type: check-answers
rows:
  - key: Planning permission type
    value: '{{ planningType }}'
    change: /nrf-quote-7/planning-type
    changeHidden: planning permission type
  - key: Housing
    value: '{{ isHousing }}'
    change: /nrf-quote-7/housing
    changeHidden: whether you are developing housing
  - key: Number of housing units
    value: '{{ residentialBuildingCount }}'
    change: /nrf-quote-7/units
    changeHidden: number of housing units
  - key: Red line boundary
    # The uploaded file's name, or "Added" for a drawn boundary (as quote-7)
    value:
      when: { key: hasRedlineBoundaryFile, truthy: true }
      then: '{{ redlineFile or "Uploaded" }}'
      else:
        when: { key: redlineBoundaryPolygon, truthy: true }
        then: Added
        else: Not added
    change:
      - when: { key: hasRedlineBoundaryFile, truthy: true }
        goto: /nrf-quote-7/file-preview
      - goto: /nrf-quote-7/map
    changeHidden:
      when: { key: hasRedlineBoundaryFile, truthy: true }
      then: uploaded red line boundary
      else: drawn red line boundary
  - key: Email address
    value: '{{ retrievalEmail }}'
    change: email
    changeHidden: email address
actions:
  - text: Continue
    kind: submit
  - text: Delete
    kind: destructive
    goto: /nrf-quote-7/delete-quote
    return: review-quote-details
    hidden: quote details
---

# Review and amend your quote details

:::warning
Make sure the details of your development match your planning application. Updates may result in a recalculation of available capacity and the levy amount.
:::
