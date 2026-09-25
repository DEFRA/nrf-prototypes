/**
 * Makes the Prototype Kit's session file store safe when a page loads many
 * files at once.
 *
 * The kit keeps each session in `.tmp/sessions/<id>.json` and runs its
 * session middleware for every request, static files included. It writes
 * the file in place, so a request that reads it mid-write (the map pages'
 * dozens of ES modules, still loading while the user presses Continue)
 * finds half a file, which the kit takes for a broken session and deletes:
 * the user is suddenly signed out, or their answers vanish. Saving also
 * reads every other session file and deletes the ones it cannot parse,
 * which catches sessions mid-write in the same way.
 *
 * Here a session is written to a temporary file and renamed over the old
 * one, so a reader only ever sees a whole file, and saving deletes only
 * expired sessions. Everything else is the kit's own store.
 */

const fs = require('fs/promises')
const path = require('path')
const FileStore = require('govuk-prototype-kit/lib/session-file-store')

const noop = () => {}

function isExpired(session) {
  const expires = session && session.cookie && session.cookie.expires
  return Boolean(expires) && new Date(expires).valueOf() < Date.now()
}

async function removeExpired(dir) {
  let files = []
  try {
    files = await fs.readdir(dir)
  } catch (error) {
    return
  }
  await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        const filename = path.join(dir, file)
        try {
          const session = JSON.parse(await fs.readFile(filename, 'utf8'))
          if (isExpired(session)) {
            await fs.rm(filename, { force: true })
          }
        } catch (error) {
          // Gone already, or never whole: left alone
        }
      })
  )
}

FileStore.prototype.set = async function set(
  sessionId,
  session,
  callback = noop
) {
  try {
    await removeExpired(this.path)
    await fs.mkdir(this.path, { recursive: true })
    const filename = path.join(this.path, `${sessionId}.json`)
    const temporary = `${filename}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}.tmp`
    await fs.writeFile(temporary, JSON.stringify(session))
    await fs.rename(temporary, filename)
    callback()
  } catch (error) {
    callback(error)
  }
}

module.exports = FileStore
