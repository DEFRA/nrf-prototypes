// Zoom, export and copy-link controls for the journey screen wall
// (/tools/journeys/<journey>)
;(function () {
  const slider = document.getElementById('wall-scale')
  const label = document.getElementById('wall-scale-value')
  const wall = document.getElementById('screen-wall')
  if (!slider || !wall) {
    return
  }

  const STORAGE_KEY = 'journey-tools-wall-scale'

  function apply(value) {
    const scale = parseFloat(value)
    wall.querySelectorAll('.wall-card').forEach(function (card) {
      card.style.setProperty('--wall-scale', scale)
    })
    if (label) {
      label.textContent = Math.round(scale * 100) + '%'
    }
  }

  let initial = slider.value
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) {
      initial = saved
      slider.value = saved
    }
  } catch (error) {
    // localStorage unavailable; use the default
  }
  apply(initial)

  slider.addEventListener('input', function () {
    apply(slider.value)
    try {
      window.localStorage.setItem(STORAGE_KEY, slider.value)
    } catch (error) {
      // ignore
    }
  })

  // The export drives a headless browser server-side, so hold the button
  // while the zip is being built to stop a double click launching two
  const exportButton = document.getElementById('wall-export')
  if (exportButton) {
    const idleText = exportButton.textContent
    const busyText = exportButton.getAttribute('data-busy-text') || idleText
    const BUSY_MS = 30000
    exportButton.addEventListener('click', function (event) {
      if (exportButton.getAttribute('aria-disabled') === 'true') {
        event.preventDefault()
        return
      }
      exportButton.textContent = busyText
      exportButton.setAttribute('aria-disabled', 'true')
      exportButton.classList.add('govuk-button--disabled')
      window.setTimeout(function () {
        exportButton.textContent = idleText
        exportButton.removeAttribute('aria-disabled')
        exportButton.classList.remove('govuk-button--disabled')
      }, BUSY_MS)
    })
  }

  // Copy the published URL of a screen to the clipboard, with a moment of
  // feedback on the button. Falls back to execCommand for plain-http hosts,
  // where navigator.clipboard is unavailable.
  function writeClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
    }
    return new Promise(function (resolve, reject) {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      let copied = false
      try {
        copied = document.execCommand('copy')
      } catch (error) {
        copied = false
      }
      document.body.removeChild(area)
      if (copied) {
        resolve()
      } else {
        reject(new Error('Copy failed'))
      }
    })
  }

  const FEEDBACK_MS = 1500
  wall.addEventListener('click', function (event) {
    const button = event.target.closest('.wall-card__copy')
    if (!button) {
      return
    }
    event.preventDefault()
    const url = button.getAttribute('data-copy-url')
    if (!url) {
      return
    }
    function feedback(state, text) {
      window.clearTimeout(button.feedbackTimer)
      button.classList.remove(
        'wall-card__copy--copied',
        'wall-card__copy--failed'
      )
      button.classList.add('wall-card__copy--' + state)
      button.setAttribute('data-feedback', text)
      button.setAttribute('title', text)
      button.feedbackTimer = window.setTimeout(function () {
        button.classList.remove('wall-card__copy--' + state)
        button.setAttribute('data-feedback', '')
        button.setAttribute('title', 'Copy link')
      }, FEEDBACK_MS)
    }
    writeClipboard(url).then(
      function () {
        feedback('copied', 'Copied')
      },
      function () {
        feedback('failed', 'Copy failed')
      }
    )
  })
})()
