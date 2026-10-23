/**
 * Journey engine: marking pages ready for dev from the screen wall
 *
 * The ⋯ menu on a card of the wall can write the page's `handoff:` date
 * into content/<journey>/journey.yaml, so the content designer can hand a
 * page over without opening the file. Local only: the deployed prototype
 * has no git and nothing to write to, and a handoff only counts once the
 * line is committed and pushed (see history.js).
 *
 * The file is edited as text, one line at a time, so its comments and
 * layout stay as they are; loading and dumping it with js-yaml would drop
 * every comment.
 */

const fs = require('fs')
const path = require('path')
const { REPO_ROOT, git, hasGit, isHandoffDate } = require('./history')
const { skipReload } = require('./watch')

// How long a read of the committed journey.yaml is reused
const CACHE_MS = 2 * 1000
const committedCache = new Map()

function yamlPath(journeyId) {
  return path.join('content', journeyId, 'journey.yaml')
}

/**
 * Whether the wall can mark pages here: in development, inside a git
 * checkout. The CDP image runs in production and ships without .git
 */
function canMarkHandoffs() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase()
  return env !== 'production' && hasGit()
}

const pad = (n) => String(n).padStart(2, '0')

// Today in the local time zone, written YYYY-MM-DD
function today(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * The comment that hands a page over again on the day it was already
 * handed over: the date cannot change, and a handoff is the commit that
 * last wrote the line, so the line needs something new on it
 */
function againNote(now = new Date()) {
  return `handed over again at ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const indentOf = (line) => line.match(/^\s*/)[0].length
const isBlank = (line) => !line.trim()

/**
 * Where a page's entry sits in the lines of journey.yaml: the index of its
 * `- id:` line, the index after its last line, the column its keys start
 * at and the index of its own `handoff:` line (or -1). Only entries in the
 * top-level `pages:` list count, so a preview variant's `- id:` is never
 * mistaken for a page. Null when the page has no entry.
 */
function findEntry(lines, pageId) {
  const pagesAt = lines.findIndex((line) => /^pages:\s*(#.*)?$/.test(line))
  if (pagesAt === -1) {
    return null
  }
  const idPattern = /^(\s*-\s+)id:\s*['"]?([^'"#\s]+)['"]?\s*(#.*)?$/
  let dashIndent = null
  for (let i = pagesAt + 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^\S/.test(line) && !line.startsWith('#')) {
      return null
    }
    const match = line.match(idPattern)
    if (!match) {
      continue
    }
    if (dashIndent === null) {
      dashIndent = indentOf(line)
    }
    if (indentOf(line) !== dashIndent || match[2] !== pageId) {
      continue
    }
    const keyColumn = match[1].length
    // The entry runs until a line no deeper than its dash: the next entry,
    // a comment above it or the next top-level key
    let end = i + 1
    while (
      end < lines.length &&
      (isBlank(lines[end]) || indentOf(lines[end]) > dashIndent)
    ) {
      end++
    }
    while (end > i + 1 && isBlank(lines[end - 1])) {
      end--
    }
    const keyPattern = new RegExp(`^ {${keyColumn}}handoff:`)
    let handoffAt = -1
    for (let j = i + 1; j < end; j++) {
      if (keyPattern.test(lines[j])) {
        handoffAt = j
      }
    }
    return { start: i, end, keyColumn, handoffAt }
  }
  return null
}

/**
 * The page's `handoff:` line in the text of a journey.yaml, as its date
 * and the comment after it (or null): { on, note }. Both null when the page
 * has no such line
 */
function readHandoffLine(text, pageId) {
  const lines = text.split('\n')
  const entry = findEntry(lines, pageId)
  if (!entry || entry.handoffAt === -1) {
    return { on: null, note: null }
  }
  const match = lines[entry.handoffAt].match(
    /handoff:\s*['"]?(\d{4}-\d{2}-\d{2})?['"]?\s*(?:#\s*(.*?)\s*)?$/
  )
  return {
    on: (match && match[1]) || null,
    note: (match && match[2]) || null
  }
}

/**
 * The page's `handoff:` date in the text of a journey.yaml, or null
 */
function readHandoff(text, pageId) {
  return readHandoffLine(text, pageId).on
}

/**
 * The text of a journey.yaml with the page's `handoff:` set to `on`, or
 * taken out when `on` is null. A new line goes at the end of the entry,
 * where the hand-typed ones sit. `note` is written after it as a comment.
 */
function writeHandoff(text, pageId, on, note = null) {
  if (on !== null && !isHandoffDate(on)) {
    throw new Error(`'${on}' is not a date written YYYY-MM-DD`)
  }
  const lines = text.split('\n')
  const entry = findEntry(lines, pageId)
  if (!entry) {
    throw new Error(`journey.yaml has no page '${pageId}'`)
  }
  const comment = note ? ` # ${note}` : ''
  const line = `${' '.repeat(entry.keyColumn)}handoff: ${on}${comment}`
  if (entry.handoffAt !== -1) {
    lines.splice(entry.handoffAt, 1, ...(on === null ? [] : [line]))
  } else if (on !== null) {
    lines.splice(entry.end, 0, line)
  }
  return lines.join('\n')
}

/**
 * Set (or with null, remove) a page's handoff date in its journey.yaml.
 * The write is kept from reloading the open tabs: the wall reloads itself
 * and puts back where you were
 */
function setHandoff(journeyId, pageId, on, note = null) {
  const file = path.join(REPO_ROOT, yamlPath(journeyId))
  const text = fs.readFileSync(file, 'utf8')
  const next = writeHandoff(text, pageId, on, note)
  if (next !== text) {
    skipReload(path.join(journeyId, 'journey.yaml'))
    fs.writeFileSync(file, next)
  }
  committedCache.delete(journeyId)
}

// The committed journey.yaml, or '' when it is new
function committedText(journeyId) {
  const cached = committedCache.get(journeyId)
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.text
  }
  const text =
    git(['show', `HEAD:${yamlPath(journeyId).split(path.sep).join('/')}`]) || ''
  committedCache.set(journeyId, { at: Date.now(), text })
  return text
}

/**
 * The page's handoff line as last committed, { on, note }, to undo a mark
 * not yet committed
 */
function committedHandoff(journeyId, pageId) {
  return readHandoffLine(committedText(journeyId), pageId)
}

/**
 * The page's handoff line as it is on disk, { on, note }
 */
function currentHandoff(journeyId, pageId) {
  const file = path.join(REPO_ROOT, yamlPath(journeyId))
  return readHandoffLine(fs.readFileSync(file, 'utf8'), pageId)
}

/**
 * What the card's menu needs to mark the page, or null when marking is
 * not available here. `pending` is an edit not yet committed, which Undo
 * reverts to the committed line. `again` is a mark not yet committed that
 * hands the page over again on the day it was already handed over
 */
function handoffMark(journey, page) {
  if (!canMarkHandoffs()) {
    return null
  }
  const on = isHandoffDate(page.handoff) ? page.handoff : null
  const committed = committedHandoff(journey.id, page.id)
  const pending =
    on !== committed.on ||
    (on !== null && currentHandoff(journey.id, page.id).note !== committed.note)
  return {
    url: `/tools/journeys/${journey.id}/pages/${page.id}/handoff`,
    on,
    committedOn: committed.on,
    pending,
    again: pending && on !== null && on === committed.on,
    today: today()
  }
}

module.exports = {
  canMarkHandoffs,
  today,
  againNote,
  findEntry,
  readHandoffLine,
  readHandoff,
  writeHandoff,
  setHandoff,
  committedHandoff,
  handoffMark
}
