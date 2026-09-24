/*
  Popover dialogs on staff pages (the record page's Change status). A link
  or button with data-dialog-open="<dialog id>" opens that <dialog> as a
  modal instead of following its href; anything inside with
  data-dialog-close, Escape or a click on the backdrop closes it. Without
  JavaScript (or <dialog> support) the link opens the full page instead.
*/
;(function () {
  function init() {
    var openers = document.querySelectorAll('[data-dialog-open]')
    Array.prototype.forEach.call(openers, function (opener) {
      var dialog = document.getElementById(
        opener.getAttribute('data-dialog-open')
      )
      if (!dialog || typeof dialog.showModal !== 'function') {
        return
      }
      opener.addEventListener('click', function (event) {
        event.preventDefault()
        dialog.showModal()
        // The chosen answer (the current status), else the first control
        var first = dialog.querySelector('input:checked, input, button')
        if (first) {
          first.focus()
        }
      })
      dialog.addEventListener('click', function (event) {
        // A click on the backdrop lands on the dialog element itself, but
        // outside its box (a click on its padding lands there too, inside)
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
      dialog.addEventListener('close', function () {
        opener.focus()
      })
      Array.prototype.forEach.call(
        dialog.querySelectorAll('[data-dialog-close]'),
        function (closer) {
          closer.addEventListener('click', function () {
            dialog.close()
          })
        }
      )
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
