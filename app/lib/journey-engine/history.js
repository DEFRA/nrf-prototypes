/**
 * Journey engine: handoff history
 *
 * A page entry in journey.yaml can carry `handoff: YYYY-MM-DD`, the date its
 * design was handed to development. This module answers whether the page's
 * copy has moved since, so the tools page and the homepage card can say
 * "Ready for dev" or "Changed since handoff" without anyone keeping a list.
 *
 * The answer comes from git: a page has changed when a commit touched its
 * markdown after the commit that wrote the `handoff:` line, or when the
 * markdown has uncommitted edits. The deployed prototype ships without a
 * .git folder, so scripts/content-history.js asks the same questions at
 * build time and writes app/data/content-history.json, which is read here
 * in preference to git when it exists.
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const REPO_ROOT = path.join(__dirname, '../../..')
const MANIFEST_FILE = path.join(REPO_ROOT, 'app/data/content-history.json')
const REPO_URL = 'https://github.com/DEFRA/nrf-prototypes'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const LABELS = {
  ready: 'Ready for dev',
  changed: 'Changed since handoff'
}
// How long a git answer is reused before asking again
const CACHE_MS = 10 * 1000

let gitAvailable = null
let manifestCache = { mtimeMs: null, manifest: null }
const memo = new Map()

function isHandoffDate(value) {
  return typeof value === 'string' && DATE_RE.test(value)
}

function tagFor(journeyId, on) {
  return `handoff/${journeyId}/${on}`
}

// The frozen copies of a page, served by app/routes/handoffs.js from a
// snapshot of the handoff commit. `latest` is the one to share: each page
// under it shows its own most recent handoff, so the link stays put when
// the page is handed over again. The dated form pins one handoff for good.
const LATEST = 'latest'

function frozenUrlFor(journeyId, pageId) {
  return `/handoffs/${journeyId}/${LATEST}/${pageId}`
}

function datedUrlFor(journeyId, on, pageId) {
  return `/handoffs/${journeyId}/${on}/${pageId}`
}

function git(args, options = {}) {
  const exec = options.exec || execFileSync
  try {
    return exec('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
  } catch (error) {
    return null
  }
}

function hasGit(options = {}) {
  if (options.exec) {
    return true
  }
  if (gitAvailable === null) {
    gitAvailable = git(['rev-parse', '--is-inside-work-tree']) === 'true'
  }
  return gitAvailable
}

/**
 * The 1-based line number of the `handoff:` key inside a page's entry in
 * journey.yaml, or null when the page has none. Works on the raw text so
 * the line can be blamed.
 */
function handoffLine(yamlText, pageId) {
  const lines = yamlText.split('\n')
  const idPattern = /^\s*-\s+id:\s*['"]?([^'"#\s]+)['"]?\s*(#.*)?$/
  let inside = false
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(idPattern)
    if (match) {
      inside = match[1] === pageId
      continue
    }
    if (inside && /^\s+handoff:/.test(lines[i])) {
      return i + 1
    }
  }
  return null
}

/**
 * The commit that wrote the page's `handoff:` line. Uncommitted (blame
 * reports the all-zero hash) comes back as { commit: null }.
 */
function stampInfo(journey, pageId, options) {
  const yamlFile = path.join(REPO_ROOT, 'content', journey.id, 'journey.yaml')
  let text
  try {
    text = fs.readFileSync(yamlFile, 'utf8')
  } catch (error) {
    return { commit: null, at: null }
  }
  const line = handoffLine(text, pageId)
  if (!line) {
    return { commit: null, at: null }
  }
  const blame = git(
    [
      'blame',
      '--porcelain',
      '-L',
      `${line},${line}`,
      '--',
      path.relative(REPO_ROOT, yamlFile)
    ],
    options
  )
  if (!blame) {
    return { commit: null, at: null }
  }
  const commit = blame.split(/\s/)[0]
  if (!commit || /^0+$/.test(commit)) {
    return { commit: null, at: null }
  }
  const time = blame.match(/^committer-time (\d+)/m)
  const at = time ? new Date(Number(time[1]) * 1000).toISOString() : null
  return { commit, at }
}

function gitHistory(journey, page, options) {
  const stamp = stampInfo(journey, page.id, options)
  const file = page.contentFile
  const lastChanged = git(['log', '-1', '--format=%cI', '--', file], options)
  const uncommitted = Boolean(
    git(['status', '--porcelain', '--', file], options)
  )
  let changed = false
  if (stamp.commit) {
    const after = git(
      ['log', '-1', '--format=%H', `${stamp.commit}..HEAD`, '--', file],
      options
    )
    // Edits after a committed stamp count, committed or not. Edits alongside
    // an uncommitted stamp are part of the same handoff.
    changed = Boolean(after) || uncommitted
  }
  return {
    stampedAt: stamp.at,
    stampCommit: stamp.commit,
    lastChanged: lastChanged || null,
    changed,
    uncommitted,
    source: 'git'
  }
}

function readManifest(options = {}) {
  if (options.manifest !== undefined) {
    return options.manifest
  }
  let mtimeMs
  try {
    mtimeMs = fs.statSync(MANIFEST_FILE).mtimeMs
  } catch (error) {
    return null
  }
  if (manifestCache.manifest && manifestCache.mtimeMs === mtimeMs) {
    return manifestCache.manifest
  }
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
    manifestCache = { mtimeMs, manifest }
    return manifest
  } catch (error) {
    return null
  }
}

/**
 * The commit the tag handoff/<journey>/<date> points at, or null when there
 * is no such tag (not pushed yet, or the date was never handed over). The
 * deployed manifest carries the tags; locally git is asked.
 */
function tagCommit(journeyId, on, options = {}) {
  const tag = tagFor(journeyId, on)
  const manifest = readManifest(options)
  if (manifest && manifest.tags) {
    return manifest.tags[tag] || null
  }
  if (!hasGit(options)) {
    return null
  }
  return (
    git(
      ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}^{commit}`],
      options
    ) || null
  )
}

/**
 * Every handoff tag in the repository: { 'handoff/<journey>/<date>': sha }.
 * An annotated tag resolves to the commit it points at.
 */
function collectTags() {
  const out = git([
    'for-each-ref',
    '--format=%(refname:short) %(objectname) %(*objectname)',
    'refs/tags/handoff/'
  ])
  const tags = {}
  for (const line of (out || '').split('\n')) {
    const [tag, object, target] = line.trim().split(/\s+/)
    if (tag && object) {
      tags[tag] = target || object
    }
  }
  return tags
}

function history(journey, page, options) {
  const key = `${journey.id}/${page.id}`
  const manifest = readManifest(options)
  if (manifest && manifest.pages && manifest.pages[key]) {
    return { ...manifest.pages[key], source: 'manifest' }
  }
  if (hasGit(options)) {
    return gitHistory(journey, page, options)
  }
  return {
    stampedAt: null,
    stampCommit: null,
    lastChanged: null,
    changed: undefined,
    uncommitted: false,
    source: null
  }
}

/**
 * Everything the UI needs about one page's handoff, or null when the page
 * carries no `handoff:`. `options.exec` and `options.manifest` are for
 * tests; leave them out in the app.
 */
function pageHandoff(journey, page, options = {}) {
  if (!isHandoffDate(page.handoff)) {
    return null
  }
  const key = `${journey.id}/${page.id}/${page.handoff}/${page.contentFile}`
  const cached = memo.get(key)
  const fresh = cached && Date.now() - cached.at < CACHE_MS
  const detail =
    fresh && !options.exec && options.manifest === undefined
      ? cached.value
      : history(journey, page, options)
  if (!fresh) {
    memo.set(key, { at: Date.now(), value: detail })
  }
  const tag = tagFor(journey.id, page.handoff)
  return {
    id: page.id,
    path: page.path,
    contentFile: page.contentFile,
    on: page.handoff,
    tag,
    tagUrl: `${REPO_URL}/tree/${tag}`,
    fileUrl: `${REPO_URL}/blob/${tag}/${page.contentFile}`,
    // The page rendered from the copy at the handoff commit; nothing to
    // freeze until the date is committed
    frozenUrl: detail.stampCommit ? frozenUrlFor(journey.id, page.id) : null,
    datedUrl: detail.stampCommit
      ? datedUrlFor(journey.id, page.handoff, page.id)
      : null,
    label: detail.changed ? LABELS.changed : LABELS.ready,
    lastChangedOn: detail.lastChanged ? detail.lastChanged.slice(0, 10) : null,
    ...detail
  }
}

/**
 * The handoffs of a whole journey, newest first.
 */
function journeyHandoffs(journey, options = {}) {
  return journey.pages
    .map((page) => pageHandoff(journey, page, options))
    .filter(Boolean)
    .sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0))
}

/**
 * The manifest scripts/content-history.js writes: every handoff of every
 * journey, answered from git now so the deployed prototype can answer
 * without it.
 */
function collectHistory(journeys) {
  const pages = {}
  for (const journey of journeys) {
    for (const page of journey.pages) {
      if (!isHandoffDate(page.handoff)) {
        continue
      }
      const { stampedAt, stampCommit, lastChanged, changed, uncommitted } =
        gitHistory(journey, page, {})
      pages[`${journey.id}/${page.id}`] = {
        on: page.handoff,
        stampedAt,
        stampCommit,
        lastChanged,
        changed,
        uncommitted
      }
    }
  }
  return { generatedAt: new Date().toISOString(), pages, tags: collectTags() }
}

module.exports = {
  REPO_ROOT,
  REPO_URL,
  MANIFEST_FILE,
  LABELS,
  isHandoffDate,
  tagFor,
  LATEST,
  frozenUrlFor,
  datedUrlFor,
  git,
  hasGit,
  handoffLine,
  tagCommit,
  pageHandoff,
  journeyHandoffs,
  collectHistory
}
