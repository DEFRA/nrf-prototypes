/*
  Staff header (app/views/includes/staff-header.html): the account and Menu
  buttons open and close their grey panels under the header. Without this
  script the buttons stay hidden and the panels stay open, so every link is
  still reachable. Opening one panel closes the other; Escape or a click
  outside the header closes both.
*/
;(function () {
  function init(header) {
    var toggles = Array.prototype.slice.call(
      header.querySelectorAll('.app-staff-header__toggle')
    )
    if (!toggles.length) {
      return
    }

    function panelOf(toggle) {
      return document.getElementById(toggle.getAttribute('aria-controls'))
    }

    function setOpen(toggle, open) {
      var panel = panelOf(toggle)
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
      toggle.parentNode.classList.toggle('app-staff-header__item--open', open)
      if (panel) {
        panel.hidden = !open
      }
    }

    function closeAll(except) {
      toggles.forEach(function (toggle) {
        if (toggle !== except) {
          setOpen(toggle, false)
        }
      })
    }

    toggles.forEach(function (toggle) {
      toggle.hidden = false
      setOpen(toggle, false)
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true'
        closeAll(toggle)
        setOpen(toggle, open)
      })
    })

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') {
        return
      }
      var open = toggles.filter(function (toggle) {
        return toggle.getAttribute('aria-expanded') === 'true'
      })[0]
      if (open) {
        setOpen(open, false)
        open.focus()
      }
    })

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) {
        closeAll()
      }
    })
  }

  function start() {
    var headers = document.querySelectorAll('[data-module="app-staff-header"]')
    Array.prototype.forEach.call(headers, init)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()
