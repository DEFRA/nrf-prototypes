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
  const STATES = [
    'wall-card__copy--busy',
    'wall-card__copy--copied',
    'wall-card__copy--failed'
  ]

  // A moment of feedback on a card button: the state colours it and the
  // text appears in the tooltip beside it, then both clear. Pass no
  // duration to hold the state until the next call (for "Exporting…")
  function feedback(button, state, text, idleTitle, duration) {
    window.clearTimeout(button.feedbackTimer)
    button.classList.remove.apply(button.classList, STATES)
    button.classList.add('wall-card__copy--' + state)
    button.setAttribute('data-feedback', text)
    button.setAttribute('title', text)
    if (duration) {
      button.feedbackTimer = window.setTimeout(function () {
        button.classList.remove('wall-card__copy--' + state)
        button.setAttribute('data-feedback', '')
        button.setAttribute('title', idleTitle)
      }, duration)
    }
  }

  function copyLink(button) {
    const url = button.getAttribute('data-copy-url')
    if (!url) {
      return
    }
    writeClipboard(url).then(
      function () {
        feedback(button, 'copied', 'Copied', 'Copy link', FEEDBACK_MS)
      },
      function () {
        feedback(button, 'failed', 'Copy failed', 'Copy link', FEEDBACK_MS)
      }
    )
  }

  // Export one screen as a JPG. The server drives a headless browser, so
  // this takes a few seconds: fetch the file so the button can say so,
  // then hand it to the browser as a download
  function exportScreen(button) {
    if (button.classList.contains('wall-card__copy--busy')) {
      return
    }
    const idleTitle = 'Export screen as JPG'
    feedback(button, 'busy', 'Exporting…', idleTitle)
    window
      .fetch(button.href)
      .then(function (response) {
        if (!response.ok) {
          return response.text().then(function (text) {
            throw new Error(text || response.statusText)
          })
        }
        return response.blob()
      })
      .then(function (blob) {
        const objectUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = button.getAttribute('download') || fileName(button.href)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.setTimeout(function () {
          window.URL.revokeObjectURL(objectUrl)
        }, 1000)
        feedback(button, 'copied', 'Exported', idleTitle, FEEDBACK_MS)
      })
      .catch(function (error) {
        feedback(button, 'failed', 'Export failed', idleTitle, FEEDBACK_MS * 2)
        window.console.error('Screen export failed', error)
      })
  }

  // The route names the file in Content-Disposition, but a download from
  // a blob URL needs a name of its own: use the journey, page and variant
  function fileName(href) {
    const url = new URL(href, window.location.href)
    const parts = url.pathname.split('/')
    const journey = parts[parts.length - 3]
    const page = parts[parts.length - 1].replace(/\.jpg$/, '')
    const variant = url.searchParams.get('variant')
    const error = url.searchParams.get('error') === '1'
    return (
      [journey, page, variant, error ? 'error' : ''].filter(Boolean).join('-') +
      '.jpg'
    )
  }

  // Group sections have walls of their own below the main one, so listen
  // on the document rather than the main wall
  document.addEventListener('click', function (event) {
    const exportButton = event.target.closest('.wall-card__export')
    if (exportButton) {
      if (!window.fetch || !window.URL || !window.URL.createObjectURL) {
        // Let the plain download link do the job
        return
      }
      event.preventDefault()
      exportScreen(exportButton)
      return
    }
    const button = event.target.closest('.wall-card__copy')
    if (!button) {
      return
    }
    event.preventDefault()
    copyLink(button)
  })
})()
