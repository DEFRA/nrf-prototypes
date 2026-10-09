---
type: check-answers
rows:
  - key: Accept levy amount
    value: '{{ acceptLevy }}'
    change: accept-levy
    changeHidden: whether you accept the levy amount
  - key: Variation
    value: '{{ isVariation }}'
    change: variation
    changeHidden: whether the development is a variation
  # The two rows about the original application only show for a variation
  - key: Original application committed to the levy
    value: '{{ originalCommitted }}'
    when: { key: isVariation, equals: 'Yes' }
    change: original-committed
    changeHidden: whether the original application was committed to using the levy
  - key: Original NRL reference
    when: { key: isVariation, equals: 'Yes' }
    value:
      when: { key: originalCommitted, equals: 'Yes' }
      then: '{{ originalReference }}'
      else: Not applicable
    change:
      - when: { key: originalCommitted, equals: 'Yes' }
        goto: original-reference
    changeHidden: the NRL reference for the original planning application
  - key: Requesting to use the levy for
    # The option chosen on defra-account-user-type.md, shown as its label
    value: '{{ defraUserType }}'
    change: defra-account-user-type
    changeHidden: who you are requesting to use the levy for
  - key: Full name
    value: '{{ developerDetails.fullName or yourAddress.fullName or account.fullName }}'
    change:
      - when: { key: account.accountType, equals: agent }
        goto: developer-details
      - when: { key: account.accountType, equals: individual }
        goto: individual-address
      - goto: org-address
    changeHidden: full name
  - key: Address
    value:
      lines:
        - '{{ developerDetails.addressLine1 or yourAddress.addressLine1 }}'
        - '{{ developerDetails.addressLine2 or yourAddress.addressLine2 }}'
        - '{{ developerDetails.town or yourAddress.town }}'
        - '{{ developerDetails.county or yourAddress.county }}'
        - '{{ developerDetails.postcode or yourAddress.postcode }}'
    change:
      - when: { key: account.accountType, equals: agent }
        goto: developer-details
      - when: { key: account.accountType, equals: individual }
        goto: individual-address
      - goto: org-address
    changeHidden: address
  - key: Details confirmed
    value: '{{ detailsConfirmed }}'
    change:
      - when: { key: account.accountType, equals: agent }
        goto: review-developer-details
      - goto: review-your-details
    changeHidden: the confirmed details
  - heading: Development details
  - key: Planning permission type
    value: '{{ planningType }}'
    change: /nrf-quote-7-1/planning-type
    changeHidden: planning permission type
  - key: Housing
    value: '{{ isHousing }}'
    change: /nrf-quote-7-1/housing
    changeHidden: whether you are developing housing
  - key: Number of housing units
    value: '{{ residentialBuildingCount }}'
    change: /nrf-quote-7-1/units
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
        goto: /nrf-quote-7-1/file-preview
      - goto: /nrf-quote-7-1/map
    changeHidden:
      when: { key: hasRedlineBoundaryFile, truthy: true }
      then: uploaded red line boundary
      else: drawn red line boundary
  - key: Email address
    value: '{{ retrievalEmail }}'
    change: email
    changeHidden: email address
options:
  - label: I confirm that, to the best of my knowledge and belief, the information provided in the application is true, accurate and complete.
    value: 'Yes'
errors:
  required: Tick the box to confirm the information is true, accurate and complete
actions:
  - text: Confirm and submit
    kind: submit
  - text: Delete
    kind: destructive
    goto: /nrf-quote-7-1/delete-quote
    return: check-your-answers
    hidden: quote details
---

# Check your answers

:::warning
Make sure the details of your development match your planning application. Updates may result in a recalculation of available capacity and the levy amount.
:::

## Requesting to use the nature restoration levy

By confirming and submitting these details, you are requesting to use the nature restoration levy.
