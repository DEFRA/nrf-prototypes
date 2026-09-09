/**
 * Journey engine: content watcher (development only)
 *
 * The Prototype Kit's own watchers never look at content/: nodemon restarts
 * on app/**\/*.js and browser-sync reloads on app/views, app/assets and
 * .tmp/public. Content is re-read per request already (see loader.js), so
 * all that is missing is a nudge to the browser. On any change under
 * content/ this touches a file inside .tmp/public, which browser-sync is
 * watching, and the open tab reloads itself.
 */

const fs = require('fs')
const path = require('path')
const { CONTENT_DIR } = require('./loader')

const RELOAD_FILE = path.join(
  __dirname,
  '../../../.tmp/public/journey-engine-reload.txt'
)
const DEBOUNCE_MS = 150

let started = false

function isDevelopment() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase()
  return env === 'development'
}

function pokeBrowserSync(changed) {
  try {
    fs.mkdirSync(path.dirname(RELOAD_FILE), { recursive: true })
    fs.writeFileSync(RELOAD_FILE, String(Date.now()))
    console.log(`content/ changed (${changed}), reloading browser`)
  } catch (error) {
    console.warn(`journey engine: could not trigger reload (${error.message})`)
  }
}

/**
 * Start watching content/ once. Safe to call repeatedly; a no-op outside
 * development or when content/ does not exist.
 */
function watchContent() {
  if (started || !isDevelopment() || !fs.existsSync(CONTENT_DIR)) {
    return false
  }
  started = true

  let timer = null
  let lastChanged = ''
  try {
    const watcher = fs.watch(
      CONTENT_DIR,
      { recursive: true },
      (eventType, filename) => {
        lastChanged = filename || eventType
        clearTimeout(timer)
        timer = setTimeout(() => pokeBrowserSync(lastChanged), DEBOUNCE_MS)
      }
    )
    watcher.on('error', (error) => {
      console.warn(`journey engine: content watcher stopped (${error.message})`)
    })
  } catch (error) {
    console.warn(
      `journey engine: could not watch content/ (${error.message}); refresh by hand`
    )
    return false
  }
  return true
}

module.exports = { watchContent, RELOAD_FILE }
