/*
  "Save your commitment certificate" (nrf-request-to-use-1, see
  app/views/nrf-request-to-use-1/save-commitment-certificate.html).

  - The button opens the browser's print window, where the user chooses
    Save as PDF.
  - Choosing a device radio shows that device's steps under the radios.
  - iPads say they are a Mac, so the server selects Safari on a Mac; a Mac
    with a touch screen is an iPad.
  - The A4 sheet is scaled down to fit a narrow screen.
  The button and radios are hidden without JavaScript (_save-certificate.scss).
*/
;(function () {
  var button = document.querySelector('[data-print]')
  var radios = document.querySelector('[data-device-radios]')
  var sheet = document.querySelector('.app-save-certificate__sheet')
  var frame = document.querySelector('.app-save-certificate__frame')

  if (button) {
    button.addEventListener('click', function () {
      window.print()
    })
  }

  function showSteps(id) {
    var steps = document.querySelectorAll('[data-device]')
    Array.prototype.forEach.call(steps, function (element) {
      element.hidden = element.getAttribute('data-device') !== id
    })
  }

  if (radios) {
    radios.addEventListener('change', function (event) {
      showSteps(event.target.value)
    })

    var safari = radios.querySelector('input[value="safari"]')
    var iphone = radios.querySelector('input[value="iphone"]')
    var chosen = /[?&]_device=/.test(window.location.search)
    if (!chosen && safari && safari.checked && iphone) {
      if (navigator.maxTouchPoints > 1) {
        iphone.checked = true
        showSteps('iphone')
      }
    }
  }

  function fitSheet() {
    if (!sheet || !frame) {
      return
    }
    sheet.style.zoom = ''
    var style = window.getComputedStyle(frame)
    var room =
      frame.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    if (sheet.offsetWidth > room) {
      sheet.style.zoom = String(room / sheet.offsetWidth)
    }
  }

  fitSheet()
  window.addEventListener('resize', fitSheet)
})()
