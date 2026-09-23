---
type: check-answers
rows:
  - key: Accept levy amount
    value: '{{ acceptLevy }}'
    change:
      - when: { key: levyIncreased, truthy: true }
        goto: levy-increased
      - goto: accept-levy
    changeHidden: whether you accept the levy amount
  - key: Variation
    value: '{{ isVariation }}'
    change: variation
    changeHidden: whether the development is a variation
  - key: Original application committed to the levy
    value:
      when: { key: isVariation, equals: 'Yes' }
      then: '{{ originalCommitted }}'
      else: Not applicable
    change:
      - when: { key: isVariation, equals: 'Yes' }
        goto: original-committed
    changeHidden: whether the original application was committed to using the levy
  - key: Original NRL reference
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
    goto: /nrf-quote-7/delete-quote
    return: check-your-answers
    hidden: quote details
---

# Check your answers

:::warning
Make sure the details of your development match your planning application. Updates may result in a recalculation of available capacity and the levy amount.
:::

## Commitment certificate

Once Natural England accepts your request to use this levy, you will be issued a commitment certificate that you can use in your planning application.

The commitment certificate will disapply the relevant environmental obligations through the planning application process.

## Details of your levy amount

### Provisional nature restoration levy amount: £{{ levyAmount }} (excluding VAT)

The provisional amount is calculated from the charging schedule in the relevant EDP(s).

### Inflation-adjusted nature restoration levy amount: £{{ levyAmount }} (excluding VAT)

The inflation-adjusted amount shows the indicative levy amount for the year this commitment was issued.

:::details How the nature restoration levy was calculated
The levy has been calculated from the details you submitted and the charging schedule for the relevant EDP(s). [Read about the charging schedule for the EDP (opens in new tab)](#).
:::

## Assuming liability to pay the nature restoration levy

Once your planning application is approved and you are ready to start development, you must assume liability to pay the levy. [Learn more about paying the nature restoration levy (opens in new tab)](#)

## Requesting to use the nature restoration levy

By confirming and submitting these details, you are requesting to use the nature restoration levy.
