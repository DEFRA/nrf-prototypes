---
type: form
layout: defra-id
caption: Register Defra account
fields:
  - name: memorable-word
    label: Memorable word
    width: 20
    autocomplete: off
    errors:
      required: Enter a memorable word
  - name: hint-question
    label: Hint question
    type: textarea
    maxLength: 100
    rows: 2
    hint: Write a question that will help you remember your memorable word. For example, "What is the name of my first school?"
    errors:
      required: Enter a hint question
button: Continue
---

# Create a memorable word

For security purposes, you are required to create a memorable word. This helps us verify your identity if you need to contact us.

This word must:

- be between 8 and 32 characters long and is not case-sensitive
- only contain a combination of letters (A-Z a-z) and numbers (0-9)

This word must not contain:

- spaces
- special characters (for example ', @ or -)
- more than 2 repeating characters such as YY or AAA
