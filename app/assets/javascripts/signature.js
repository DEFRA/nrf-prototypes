// The typed signature on a `type: signature` page
// (app/views/journey-engine/signature.html): the name in the box shows on
// the signature line below it as it is typed
;(function () {
  document.querySelectorAll('[data-signature-input]').forEach((input) => {
    const preview = document.querySelector(
      `[data-signature-for="${input.dataset.signatureInput}"] .app-signature__name`
    )
    if (!preview) {
      return
    }
    const update = () => {
      preview.textContent = input.value
    }
    input.addEventListener('input', update)
    update()
  })
})()
