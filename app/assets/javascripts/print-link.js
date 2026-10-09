/*
  Print link (GOV.UK Publishing's print_link component), beside the
  commitment certificate (app/views/nrf-request-to-use-1-1/
  commitment-certificate.html). It opens the browser's print window, where
  the user can print the certificate or save it as a PDF. The link is hidden
  without JavaScript (_commitment-certificate.scss).
*/
;(function () {
  var buttons = document.querySelectorAll('[data-module="app-print-link"]')
  Array.prototype.forEach.call(buttons, function (button) {
    button.addEventListener('click', function () {
      window.print()
    })
  })
})()
