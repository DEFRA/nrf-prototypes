---
# Confirm sets the planning application stage to Granted, keeps these
# details on the record and returns to the dashboard (hooks.js)
type: check-answers
caption: '{{ decisionRecord }}'
rows:
  - key: Planning decision reference
    value: '{{ decisionReference }}'
    change: decision-reference
    changeHidden: planning decision reference
  - key: Number of units
    value: '{{ decisionUnits }}'
    change: decision-units
    changeHidden: number of units
  - key: Planning permission type
    value: '{{ decisionPlanningType }}'
    change: decision-planning-type
    changeHidden: planning permission type
  - key: Address of the proposed development
    value:
      lines:
        - '{{ decisionAddress.addressLine1 }}'
        - '{{ decisionAddress.addressLine2 }}'
        - '{{ decisionAddress.town }}'
        - '{{ decisionAddress.county }}'
        - '{{ decisionAddress.postcode }}'
    change: decision-address
    changeHidden: address of the proposed development
  - key: Description of the proposed development
    value:
      when: { key: decisionDescription, truthy: true }
      then: '{{ decisionDescription }}'
      else: Not given
    change: decision-description
    changeHidden: description of the proposed development
actions:
  - text: Confirm
    kind: submit
  - text: Cancel
    kind: link
    goto: view-record
---

# Check the planning decision details

Confirming will change the planning application stage to granted.
