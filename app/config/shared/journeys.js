/**
 * Shared journey registry
 *
 * Merges two sources into one list that the homepage, app/routes.js and the
 * e2e tests all read:
 *
 *  1. app/config/shared/journeys.yaml: the hand-coded journeys, with the
 *     family, version, status and copy shown on their homepage cards.
 *  2. content/<id>/journey.yaml: content-driven journeys, discovered
 *     automatically. Their card metadata lives in a `homepage:` block.
 *
 * Both sources are re-read on demand (cheap, mtime-cached), so edits to
 * either YAML show on the homepage without a restart. `JOURNEYS` is the
 * snapshot taken at boot, which is what routing needs.
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
// Require the loader directly rather than the engine index so that tests can
// import this file without pulling in multer and playwright.
const {
  loadJourney,
  getJourneyIds,
  CONTENT_DIR
} = require('../../lib/journey-engine/loader')

const REGISTRY_FILE = path.join(__dirname, 'journeys.yaml')
const STATUSES = ['tested', 'in-progress', 'spike']

let registryCache = { mtimeMs: null, registry: null }
const mountedIds = new Set()

function readRegistry() {
  const mtimeMs = fs.statSync(REGISTRY_FILE).mtimeMs
  if (registryCache.registry && registryCache.mtimeMs === mtimeMs) {
    return registryCache.registry
  }
  const raw = yaml.load(fs.readFileSync(REGISTRY_FILE, 'utf8')) || {}
  const registry = {
    families: (raw.families || []).map((family) => ({
      id: family.id,
      label: family.label || family.id,
      versioned: family.versioned !== false
    })),
    journeys: raw.journeys || []
  }
  if (registry.families.length === 0) {
    throw new Error(`${REGISTRY_FILE}: needs a non-empty list of families`)
  }
  registryCache = { mtimeMs, registry }
  return registry
}

function getFamilies() {
  return readRegistry().families
}

function familyIds() {
  return getFamilies().map((family) => family.id)
}

/**
 * Fold `changes` into a list of groups: [{ heading?, items: [] }].
 * Plain strings become items of a heading-less group.
 */
function normaliseChanges(raw) {
  if (!Array.isArray(raw)) {
    return []
  }
  const groups = []
  for (const entry of raw) {
    if (entry && typeof entry === 'object' && Array.isArray(entry.items)) {
      groups.push({
        heading: entry.heading,
        items: entry.items.map(String)
      })
    } else if (entry !== undefined && entry !== null) {
      const last = groups[groups.length - 1]
      if (last && !last.heading) {
        last.items.push(String(entry))
      } else {
        groups.push({ heading: undefined, items: [String(entry)] })
      }
    }
  }
  return groups
}

function normaliseEntryPath(entryPath) {
  if (entryPath === undefined || entryPath === null) {
    return '/start'
  }
  const trimmed = String(entryPath).trim()
  if (trimmed === '' || trimmed === '/') {
    return ''
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Common card shape for both sources.
 */
function normaliseEntry(raw, source, extra = {}) {
  const id = raw.id
  if (!id) {
    throw new Error(`journeys.yaml: every journey needs an 'id'`)
  }
  const family = familyIds().includes(raw.family) ? raw.family : 'other'
  if (raw.family && family !== raw.family) {
    console.warn(
      `⚠ journey '${id}': unknown family '${raw.family}', showing under 'other'`
    )
  }
  const version = Number.isFinite(Number(raw.version)) ? Number(raw.version) : 0
  const status = STATUSES.includes(raw.status) ? raw.status : 'in-progress'
  const basePath = extra.basePath || `/${id}`
  const entryPath = normaliseEntryPath(
    extra.entryPath !== undefined ? extra.entryPath : raw.entryPath
  )

  return {
    id,
    source,
    family,
    version,
    versionLabel: raw.versionLabel || (version ? `V${version}` : ''),
    variant: raw.variant,
    status,
    name: raw.name || id,
    title: raw.title || raw.name || id,
    description: raw.description || '',
    changesTitle: raw.changesTitle || 'Design changes',
    changes: normaliseChanges(raw.changes),
    basePath,
    entryPath,
    entryUrl: `${basePath}${entryPath}` || '/',
    hasStartPage: entryPath === '/start',
    toolsUrl: extra.toolsUrl,
    mount: raw.mount !== false,
    error: extra.error
  }
}

function legacyJourneys() {
  return readRegistry().journeys.map((entry) => normaliseEntry(entry, 'legacy'))
}

/**
 * Card for a content journey. A broken definition must not take the homepage
 * down, so load errors become an 'error' card in the right family where the
 * raw YAML can still be read.
 */
function contentJourney(id) {
  try {
    const journey = loadJourney(id)
    const homepage = journey.homepage || {}
    return normaliseEntry(
      { ...homepage, id, name: homepage.name || journey.name },
      'content',
      {
        basePath: journey.basePath,
        entryPath: `/${journey.start}`,
        toolsUrl: `/tools/journeys/${id}`
      }
    )
  } catch (error) {
    let homepage = {}
    try {
      const file = path.join(CONTENT_DIR, id, 'journey.yaml')
      homepage = (yaml.load(fs.readFileSync(file, 'utf8')) || {}).homepage || {}
    } catch (ignored) {
      homepage = {}
    }
    const card = normaliseEntry({ ...homepage, id }, 'content', {
      toolsUrl: `/tools/journeys/${id}`,
      error: error.message
    })
    card.status = 'error'
    card.hasStartPage = false
    card.mount = false
    return card
  }
}

function contentJourneys() {
  return getJourneyIds().map(contentJourney)
}

/**
 * Every journey, legacy first then content. A registry entry wins over a
 * content journey with the same id.
 */
function getJourneys() {
  const journeys = legacyJourneys()
  const seen = new Set(journeys.map((journey) => journey.id))
  for (const journey of contentJourneys()) {
    if (seen.has(journey.id)) {
      console.warn(
        `⚠ journey '${journey.id}' is in journeys.yaml and content/; the registry entry wins`
      )
      continue
    }
    seen.add(journey.id)
    journeys.push(journey)
  }
  return journeys
}

/**
 * Journeys grouped for the homepage tabs.
 * Versioned families: `latest` is the highest version, `previous` the rest,
 * newest first. Unversioned families: everything in `all`, registry order.
 */
function groupJourneysByFamily() {
  const journeys = getJourneys()
  return getFamilies().map((family) => {
    const all = journeys.filter((journey) => journey.family === family.id)
    if (family.versioned) {
      all.sort((a, b) => b.version - a.version)
    }
    return {
      id: family.id,
      label: family.label,
      versioned: family.versioned,
      latest: family.versioned ? all[0] : undefined,
      previous: family.versioned ? all.slice(1) : [],
      all
    }
  })
}

/**
 * Record which journeys app/routes.js actually mounted at boot, so the
 * homepage can flag a content journey added since then.
 */
function setMountedIds(ids) {
  mountedIds.clear()
  for (const id of ids) {
    mountedIds.add(id)
  }
}

function isMounted(id) {
  return mountedIds.size === 0 || mountedIds.has(id)
}

/**
 * Get all journeys that have a start page
 * Useful for testing journey entry points
 */
function getJourneysWithStartPage() {
  return getJourneys()
    .filter((journey) => journey.hasStartPage && !journey.error)
    .map((journey) => ({
      name: journey.name,
      path: `${journey.basePath}/start`
    }))
}

/**
 * Get all journey base paths
 */
function getAllJourneyPaths() {
  return getJourneys().map((journey) => journey.basePath)
}

/**
 * Get journey by base path
 */
function getJourneyByPath(basePath) {
  return getJourneys().find((journey) => journey.basePath === basePath)
}

const JOURNEYS = getJourneys()

module.exports = {
  JOURNEYS,
  getJourneys,
  getFamilies,
  groupJourneysByFamily,
  setMountedIds,
  isMounted,
  getJourneysWithStartPage,
  getAllJourneyPaths,
  getJourneyByPath
}
