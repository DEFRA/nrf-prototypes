/**
 * Journey engine: frozen copies of handoffs
 *
 * A page handed to development (`handoff: <date>` in journey.yaml, see
 * history.js) gets a URL that keeps showing the copy as handed over however
 * much the live page moves afterwards:
 *
 *   /handoffs/<journey>/<date>/<page>
 *
 * The copy comes from a snapshot of content/ at the commit that wrote the
 * handoff line, extracted with `git archive` into a folder laid out like
 * the repository (<snapshot>/content/<journey>/...), which the loader reads
 * like content/ itself. Templates, hooks and the engine are today's; only
 * the content (copy, options, errors, flow) is frozen.
 *
 * Locally the snapshot is extracted on demand into .tmp/handoffs/<commit>.
 * The deployed prototype has no .git folder, so scripts/handoff-snapshots.js
 * extracts every commit the manifest names into app/data/handoffs/<commit>
 * at build time, which is looked up first.
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { loadJourney } = require('./loader')
const {
  REPO_ROOT,
  REPO_URL,
  isHandoffDate,
  tagFor,
  hasGit,
  tagCommit,
  journeyHandoffs
} = require('./history')

const BAKED_ROOT = path.join(REPO_ROOT, 'app/data/handoffs')
const LOCAL_ROOT = path.join(REPO_ROOT, '.tmp/handoffs')
const SHA_RE = /^[0-9a-f]{40}$/
const MOUNT = '/handoffs'

function basePathFor(journeyId, on) {
  return `${MOUNT}/${journeyId}/${on}`
}

/**
 * The folder holding a commit's snapshot (it contains content/), looking in
 * the baked folder first and then the local cache, or null.
 */
function snapshotDir(commit) {
  if (!SHA_RE.test(commit)) {
    return null
  }
  for (const root of [BAKED_ROOT, LOCAL_ROOT]) {
    const dir = path.join(root, commit)
    if (fs.existsSync(path.join(dir, 'content'))) {
      return dir
    }
  }
  return null
}

/**
 * Extract content/ at `commit` into <root>/<commit>/content with git
 * archive. Written next to its final name and renamed into place, so a
 * request arriving mid-extraction never sees a half-written snapshot.
 * Returns the snapshot folder.
 */
function extractSnapshot(commit, root) {
  if (!SHA_RE.test(commit)) {
    throw new Error(`Not a commit: ${commit}`)
  }
  const dest = path.join(root, commit)
  if (fs.existsSync(path.join(dest, 'content'))) {
    return dest
  }
  const archive = execFileSync(
    'git',
    ['archive', '--format=tar', commit, '--', 'content'],
    {
      cwd: REPO_ROOT,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    }
  )
  const staging = `${dest}.${process.pid}.${Date.now()}`
  fs.mkdirSync(staging, { recursive: true })
  try {
    execFileSync('tar', ['-x', '-C', staging], {
      input: archive,
      stdio: ['pipe', 'ignore', 'ignore']
    })
    fs.mkdirSync(root, { recursive: true })
    fs.renameSync(staging, dest)
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true })
    // Another request finished first
    if (fs.existsSync(path.join(dest, 'content'))) {
      return dest
    }
    throw error
  }
  return dest
}

/**
 * The snapshot folder for a commit, extracting it locally when git is
 * available. Null when it cannot be had (no git and not baked).
 */
function ensureSnapshot(commit) {
  const existing = snapshotDir(commit)
  if (existing) {
    return existing
  }
  if (!hasGit()) {
    return null
  }
  try {
    return extractSnapshot(commit, LOCAL_ROOT)
  } catch (error) {
    console.warn(`⚠ Could not snapshot ${commit}: ${error.message}`)
    return null
  }
}

/**
 * Which commit holds the journey "as handed over on `date`", for a visit
 * that starts on `pageId`:
 *
 *   1. that page's own handoff commit, when it is stamped with the date
 *      (exact, even when two pages got the same date in different pushes);
 *   2. else the newest handoff commit among the pages stamped with the date
 *      (so Continue keeps working inside the frozen copy);
 *   3. else the commit the tag handoff/<journey>/<date> points at, which
 *      keeps an old URL alive after the page is handed over again.
 *
 * Returns { commit, via } or null. `options` are history.js's test hooks.
 */
function resolveHandoffCommit(journeyId, date, pageId, options = {}) {
  const live = loadJourney(journeyId)
  const stamped = journeyHandoffs(live, options).filter(
    (item) => item.on === date && item.stampCommit
  )
  const own = stamped.find((item) => item.id === pageId)
  if (own) {
    return { commit: own.stampCommit, via: 'page' }
  }
  const newest = stamped.sort((a, b) =>
    (b.stampedAt || '').localeCompare(a.stampedAt || '')
  )[0]
  if (newest) {
    return { commit: newest.stampCommit, via: 'date' }
  }
  const tagged = tagCommit(journeyId, date, options)
  if (tagged) {
    return { commit: tagged, via: 'tag' }
  }
  return null
}

function longDate(on) {
  return new Date(`${on}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

/**
 * The journey as handed over on `date`, mounted at /handoffs/<journey>/<date>,
 * or { error, status } when there is nothing to show. `journey.frozen`
 * carries what the banner says.
 */
function loadFrozenJourney(journeyId, date, pageId, options = {}) {
  if (!isHandoffDate(date)) {
    return { error: `${date} is not a date written YYYY-MM-DD`, status: 404 }
  }
  let live
  try {
    live = loadJourney(journeyId)
  } catch (error) {
    return { error: error.message, status: 404 }
  }
  const resolved = resolveHandoffCommit(journeyId, date, pageId, options)
  if (!resolved) {
    return {
      error: `No page of ${journeyId} was handed over on ${date}`,
      status: 404
    }
  }
  const dir = ensureSnapshot(resolved.commit)
  if (!dir) {
    return {
      error: `The copy handed over on ${date} (commit ${resolved.commit.slice(0, 7)}) is not available here`,
      status: 404
    }
  }
  const basePath = basePathFor(journeyId, date)
  let journey
  try {
    journey = loadJourney(journeyId, {
      contentDir: path.join(dir, 'content'),
      basePath
    })
  } catch (error) {
    return {
      error: `The copy handed over on ${date} no longer loads: ${error.message}`,
      status: 500
    }
  }
  // Hook endpoints (the map's boundary check) are registered once on the
  // live journey; the frozen copy points at the same ones
  Object.assign(journey.routes, live.hookRoutes || {})
  journey.hookRoutes = live.hookRoutes
  const tag = tagFor(journeyId, date)
  journey.frozen = {
    on: date,
    onText: longDate(date),
    commit: resolved.commit,
    via: resolved.via,
    tag,
    tagUrl: `${REPO_URL}/tree/${tag}`,
    commitUrl: `${REPO_URL}/commit/${resolved.commit}`,
    liveBasePath: live.basePath,
    toolsPath: `/tools/journeys/${journeyId}`
  }
  return { journey }
}

module.exports = {
  MOUNT,
  BAKED_ROOT,
  LOCAL_ROOT,
  basePathFor,
  snapshotDir,
  extractSnapshot,
  ensureSnapshot,
  resolveHandoffCommit,
  loadFrozenJourney
}
