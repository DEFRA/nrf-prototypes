// Zoom control for the journey screen wall (/tools/journeys/<journey>)
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
})()
