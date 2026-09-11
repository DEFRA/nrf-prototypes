---
type: check-answers
layout: defra-id
caption: Register Defra account
rows:
  - heading: Defra account
  - key: Account type
    value: Individual
    change: defra-registration-type
    changeHidden: account type
  - heading: Your details
  - key: Name
    value: '{{ defraName.firstName }} {{ defraName.lastName }}'
    change: defra-name
    changeHidden: name
  - key: Telephone number
    value: '{{ defraTelephone.telephoneNumber }}'
    change: defra-telephone
    changeHidden: telephone number
  - key: Address
    value: '{{ defraAddress }}'
    change:
      - when: { key: defraAddressManual, isSet: true }
        goto: defra-address-manual
      - goto: defra-postcode
    changeHidden: address
  - key: Memorable word
    value: '{{ defraMemorableWord.memorableWord }}'
    change: defra-memorable-word
    changeHidden: memorable word
  - key: Hint question
    value: '{{ defraMemorableWord.hintQuestion }}'
    change: defra-memorable-word
    changeHidden: hint question
actions:
  - text: Confirm and complete registration
    kind: submit
---

# Check your answers
