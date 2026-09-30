/*
  "Save your commitment certificate" (nrf-request-to-use-1, see
  app/views/nrf-request-to-use-1/save-commitment-certificate.html).

  - The print button opens the browser's print window, where the user
    chooses Save as PDF. It needs JavaScript, so it starts hidden.
  - The "Using a different device" links show that device's steps without
    reloading the page (without JavaScript they reload with ?_device=).
  - iPads say they are a Mac, so the server shows the Safari on a Mac
    steps; a Mac with a touch screen is an iPad.
  - The A4 sheet is scaled down to fit a narrow screen.
*/
;(function () {
  var button = document.querySelector('[data-print]')
  var sheet = document.querySelector('.app-save-certificate__sheet')
  var frame = document.querySelector('.app-save-certificate__frame')

  if (button) {
    button.hidden = false
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

  var links = document.querySelectorAll('[data-device-link]')
  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault()
      showSteps(link.getAttribute('data-device-link'))
    })
  })

  var safari = document.querySelector('[data-device="safari"]')
  var chosen = /[?&]_device=/.test(window.location.search)
  if (!chosen && safari && !safari.hidden && navigator.maxTouchPoints > 1) {
    showSteps('iphone')
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
