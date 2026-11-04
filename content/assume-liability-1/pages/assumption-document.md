---
# PLACEHOLDER COPY: the assumption of liability document and who it is
# waiting on (app/views/assume-liability-1/assumption-document.html). The
# document's words are the page's body. Continue to sign leads to the
# signing page until the user has signed; on the main liable person's
# record everyone else's row has a Remind link. Continue shows once
# everyone has signed. The tags (the document's
# and each person's) are the statuses in records.yaml.
type: custom
button: Continue
text:
  # Below the signatures: back to the list of jointly liable people (Remove
  # and Add another person), or to "Is there anyone else...?" when nobody
  # else is listed
  changePeople: Change who is jointly liable
  addPeople: Add someone who is jointly liable
  caption: '{reference}'
  signaturesHeading: Jointly liable people
  columns:
    name: Name
    organisation: Organisation
    email: Email address
    status: Status
    actions: Action
    # In place of Action once everyone has signed: the date each signed
    date: Date
  you: (you)
  signed: Signed
  # Until the user has signed: the button to the signing page
  continueToSign: Sign the assumption of liability
  # The main liable person's Remind links (their column's heading is only
  # for screen readers); the hidden words finish the link, {name} is the
  # person
  remind: Remind
  remindHidden: '{name}'
  # PLACEHOLDER: after a Remind link; {name} is the person reminded
  reminderSent: We have sent a reminder to {name}.
  # {count} is the number of people still to sign
  waitingOne: We are waiting for 1 person to sign.
  waitingMany: We are waiting for {count} people to sign.
  # After the waiting message, for the primary user only
  paymentAfter: You can add the payment details once everyone has signed.
  # A secondary user once everyone has signed; {name} is the primary user
  allSignedSecondary: Everyone has signed. {name} will add the payment details.
  back: Return to manage the nature restoration levy
---

# Assumption of liability

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

## 1. Lorem ipsum

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## 2. Dolor sit amet

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

- Sed ut perspiciatis unde omnis iste natus
- Nemo enim ipsam voluptatem quia voluptas
- Neque porro quisquam est qui dolorem ipsum
