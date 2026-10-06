/*
  Dialogs on staff pages (the "Add reserved matters" modal and drawer in
  app/views/lpa-manage-1/_reserved-matters.html): a button with
  data-dialog-open="<id>" opens that <dialog> as a modal; its Cancel
  button (data-dialog-close), Escape or a click on the backdrop closes it.
  A dialog rendered with data-open="true" (its form has errors, or the
  screen wall's open sample) opens as soon as the page loads.
*/
;(function () {
  function open(dialog) {
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
      dialog.showModal()
    }
  }

  document.querySelectorAll('[data-dialog-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      open(document.getElementById(button.getAttribute('data-dialog-open')))
    })
  })

  document
    .querySelectorAll('dialog.app-staff-dialog')
    .forEach(function (dialog) {
      dialog.querySelectorAll('[data-dialog-close]').forEach(function (button) {
        button.addEventListener('click', function (event) {
          event.preventDefault()
          dialog.close()
        })
      })
      // A click that lands on the dialog itself, outside its padding box's
      // content, was on the backdrop
      dialog.addEventListener('click', function (event) {
        if (event.target !== dialog) {
          return
        }
        var box = dialog.getBoundingClientRect()
        var inside =
          event.clientX >= box.left &&
          event.clientX <= box.right &&
          event.clientY >= box.top &&
          event.clientY <= box.bottom
        if (!inside) {
          dialog.close()
        }
      })
      if (dialog.getAttribute('data-open') === 'true') {
        open(dialog)
      }
    })
})()
