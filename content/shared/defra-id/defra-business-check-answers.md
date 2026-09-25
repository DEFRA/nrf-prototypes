---
type: check-answers
layout: defra-account
caption: Register new Defra account
rows:
  - heading: Defra account
  - key: Account type
    value: Business
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
    changeHidden: your telephone number
  - heading: Business details
  - key: Type
    value: Limited company
  - key: Company number
    value: '{{ defraCrn.companyRegistrationNumber or "Not provided" }}'
    change:
      - when: { key: defraHasCrn, equals: 'Yes' }
        goto: defra-crn
      - goto: defra-has-crn
    changeHidden: company registration number
  - key: Company name
    value: '{{ researchParticipant.organisation or "Fenland Homes" }}'
  - key: Registered address
    value:
      lines:
        - 1 Church Street
        - London
        - SW1A 1AA
  - key: Telephone number
    value: '{{ defraBusinessContact.telephoneNumber }}'
    change: defra-business-contact
    changeHidden: telephone number
  - key: Email address
    value: '{{ defraBusinessContact.emailAddress }}'
    change: defra-business-contact
    changeHidden: email address
actions:
  - text: Accept and continue
    kind: submit
---

# Check your answers
