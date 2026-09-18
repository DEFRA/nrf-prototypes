//
// Participant details box (includes/research-participant.html): opens the
// <dialog> as a modal from the footer link, or straight away when the page
// was opened with ?participant, and closes it from "Not now", Escape or a
// click on the backdrop. The dialog waits in a <template> until it is
// wanted and leaves the page again when closed, so its name boxes never
// sit beside the journey's own. Without JavaScript the footer link reloads
// the page with ?participant and the dialog is rendered open in the page.
//
;(function () {
  const template = document.getElementById('research-participant-template')

  function wire(dialog) {
    dialog.querySelectorAll('[data-participant-close]').forEach((button) => {
      button.addEventListener('click', () => {
        dialog.close()
      })
    })
    // The form fills the dialog, so a click that lands on the dialog itself
    // was on the backdrop
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close()
      }
    })
    if (template) {
      dialog.addEventListener('close', () => {
        dialog.remove()
      })
    }
  }

  function dialogElement() {
    let dialog = document.querySelector('[data-module="research-participant"]')
    if (!dialog && template) {
      document.body.appendChild(template.content.cloneNode(true))
      dialog = document.querySelector('[data-module="research-participant"]')
      if (dialog) {
        wire(dialog)
      }
    }
    return dialog
  }

  function open() {
    const dialog = dialogElement()
    if (!dialog || typeof dialog.showModal !== 'function') {
      return
    }
    // Rendered open (the no-JavaScript fallback) it must close before it
    // can open as a modal
    if (dialog.open) {
      dialog.close()
    }
    dialog.showModal()
  }

  document.querySelectorAll('[data-participant-open]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      open()
    })
  })

  const rendered = document.querySelector(
    '[data-module="research-participant"]'
  )
  if (rendered) {
    wire(rendered)
    if (rendered.dataset.open === 'true') {
      open()
    }
  }
})()
