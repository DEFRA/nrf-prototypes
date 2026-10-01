---
# The commitment certificate as a page the developer saves as a PDF
# (app/views/nrf-request-to-use-1-1/save-commitment-certificate.html), linked
# from the email in place of an attachment. The certificate itself is
# commitment-certificate.md, shown on an A4 sheet below this copy.
# `devices` are the radios and the steps under them: the one matching the
# user's device starts selected (?_device=<id> picks one). Without
# JavaScript there is no button or radios, only `noScriptSteps`.
type: custom
text:
  printButton: Print to save as PDF
  stepsHeading: How to save it as a PDF
  deviceLegend: Which device or browser are you using?
  previewHeading: Your commitment certificate
  devices:
    - id: chrome
      name: Chrome or Edge on a computer
      steps:
        - Select **Print to save as PDF**.
        - Under **Destination** or **Printer**, choose **Save as PDF**.
        - Select **Save** and choose where to keep the file.
    - id: firefox
      name: Firefox on a computer
      steps:
        - Select **Print to save as PDF**.
        - Under **Destination**, choose **Save to PDF**.
        - Select **Save** and choose where to keep the file.
    - id: safari
      name: Safari on a Mac
      steps:
        - Select **Print to save as PDF**.
        - Open the **PDF** menu at the bottom of the print window and choose **Save as PDF**.
        - Choose where to keep the file and select **Save**.
    - id: iphone
      name: iPhone or iPad
      steps:
        - Tap **Print to save as PDF**.
        - Tap the share icon at the top of the print options.
        - Tap **Save to Files** and choose where to keep the file.
    - id: android
      name: Android phone or tablet
      steps:
        - Tap **Print to save as PDF**.
        - Tap the printer name at the top and choose **Save as PDF**.
        - Tap the PDF icon, then **Save**.
  noScriptSteps:
    - Open your browser's print option. On a computer, press **Ctrl** and **P** (Windows) or **Command** and **P** (Mac). On a phone or tablet, find **Print** in your browser's share or menu options.
    - Change the printer or destination to **Save as PDF** (or **Save to Files** on an iPhone or iPad).
    - Save the file and choose where to keep it.
---

# Save your commitment certificate

Keep a copy of your commitment certificate. You will need to submit it as part of any planning and decision-making processes.

Save it as a PDF so you can send it to your local planning authority.
