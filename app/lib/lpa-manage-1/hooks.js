/**
 * Hooks for the content-driven LPA journey "Manage commitments to the
 * nature restoration levy" (content/lpa-manage-1). The engine renders the
 * pages and follows journey.yaml; this file adds the bits that need code:
 *
 *   - the officer signing in with the mock GOV.UK One Login: the name the
 *     facilitator gave in the footer's "Participant details" box, or a
 *     stand-in, shown in the staff header over "Scarfolk Council". An
 *     email with "new" in it stands for a council that has no records yet:
 *     records.yaml's records are hidden and the officer lands on "Enter an
 *     NRL reference" rather than the dashboard
 *   - a mock commitment store: content/lpa-manage-1/records.yaml holds the
 *     commitments developers have submitted and the records the council
 *     already has. Retrieving a reference finds it there, or the commitment
 *     made in nrf-request-to-use-1 this session, or the file's `fallback`
 *   - the records the officer adds, and every status they change, kept in
 *     the session (`lpaRecords`) over the file's own
 *   - the dashboard's counts and its table of every record, with search,
 *     filters, sortable columns and pages
 *   - a reference the council already has a record for asks whether it is
 *     a planning variation; one that is takes the new planning application
 *     reference and keeps the original on the record
 *   - a commitment the developer made for a variation names the original
 *     application's NRL reference (`originalReference`, from
 *     nrf-request-to-use-1 or records.yaml): the two records link to each
 *     other
 *   - the record page's audit timeline and its review options, which post
 *     back to the page and return to the dashboard, and the full
 *     certificate behind it
 *   - once a planning permission is granted the record page offers the
 *     granted options; for an outline application one of them opens the
 *     add-reserved-matters page, whose form adds a reserved matters
 *     application to the record (its own post route)
 *
 * Nothing here is real: no passwords are checked or stored.
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { message } = require('../journey-engine/validation')
const { loadJourney } = require('../journey-engine/loader')
const { buildContext, buildModel } = require('../journey-engine/router')
const { participantOf } = require('../nrf-request-to-use-1/hooks')

const RECORDS_FILE = path.join(
  __dirname,
  '../../../content/lpa-manage-1/records.yaml'
)
const REFERENCE = /^NRL-\d{6}$/
// Who is signed in when the facilitator has not given the participant's name
const MOCK_OFFICER = 'John Smith'
// How many records the dashboard's table shows, and the full table per page
const RECORDS_PER_PAGE = 10
// The status of a record an officer has just added, and the stage of its
// planning application
const ADDED_STATUS = 'for-review'
const ADDED_STAGE = 'applied'
// Rejecting asks why on its own page, with an optional comment
const REJECTED_STATUS = 'rejected'
const COMMENT_FIELD = 'reject-comment'
// Reviewing the commitment details moves a record on to its planning
// application's stage; putting it off keeps it For review
const REVIEWED_STATUS = 'reviewed'
const REVIEW_LATER = 'review-later'
const PLANNING_STEP = 'planning'
// Once the planning permission is granted the granted options take the
// planning stages' place (`step: granted`)
const GRANTED_STEP = 'granted'
const GRANTED_STAGE = 'granted'
// An outline planning application, once granted, takes reserved matters
// applications: each a reference, a status (a planning stage) and a short
// description of no more than DESCRIPTION_LIMIT characters. Its granted
// option of that value opens the add-reserved-matters page.
const OUTLINE_TYPE = 'Outline planning permission'
const RESERVED_MATTERS = 'reserved-matters'
// A granted option still to be decided: Confirm changes nothing
const PLACEHOLDER_OPTION = 'placeholder'
const RESERVED_MATTERS_FIELDS = {
  reference: 'reserved-matters-reference',
  status: 'reserved-matters-status',
  description: 'reserved-matters-description'
}
const DESCRIPTION_LIMIT = 200
// "Is this a planning variation?"
const IS_VARIATION = 'yes'
const SESSION_KEYS = ['officer', 'signInEmail']
// Signing in with an email containing this is a council with no records yet
const NEW_COUNCIL = 'new'
// The council's email domain, for an officer records.yaml gives no email
const COUNCIL_DOMAIN = 'scarfolk.gov.uk'

// ------------------------------------------------------------ The data

let cached = null

/**
 * records.yaml, re-read whenever it changes so edits show on the next page
 * load without a restart
 */
function loadStore() {
  let mtime = 0
  try {
    mtime = fs.statSync(RECORDS_FILE).mtimeMs
  } catch (error) {
    return {
      statuses: {},
      planningStages: {},
      planningTypes: {},
      boundaries: {},
      officers: {},
      commitments: []
    }
  }
  if (!cached || cached.mtime !== mtime) {
    const raw = yaml.load(fs.readFileSync(RECORDS_FILE, 'utf8')) || {}
    cached = {
      mtime,
      store: {
        statuses: raw.statuses || {},
        planningStages: raw.planningStages || {},
        planningTypes: raw.planningTypes || {},
        boundaries: raw.boundaries || {},
        officers: raw.officers || {},
        commitments: raw.commitments || [],
        fallback: raw.fallback || null
      }
    }
  }
  return cached.store
}

// YAML reads 2026-09-05 as a Date (midnight UTC) and 2026-09-05T10:12 as a
// string; both become a Date here
function toDate(value) {
  if (value instanceof Date) {
    return value
  }
  if (!value) {
    return null
  }
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

// "5 September 2026", or "5 Sep 2026" in the tables (en-GB's short month
// for September is "Sept")
function formatDate(value, month = 'long') {
  const date = toDate(value)
  if (!date) {
    return ''
  }
  const long = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London'
  }).format(date)
  return month === 'short'
    ? long.replace(/ ([A-Za-z]{3})[a-z]* /, ' $1 ')
    : long
}

function formatTime(value) {
  const date = toDate(value)
  return date
    ? new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Europe/London'
      })
        .format(date)
        .replace(' ', '')
    : ''
}

// Local time as YYYY-MM-DDTHH:MM, the way records.yaml writes it
function nowStamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}

function addMonths(date, months) {
  const next = new Date(date.getTime())
  next.setMonth(next.getMonth() + months)
  return next
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function boundaryOf(entry, store) {
  if (entry.boundary && typeof entry.boundary === 'object') {
    return entry.boundary
  }
  if (Array.isArray(entry.coordinates)) {
    return { coordinates: entry.coordinates }
  }
  const ring = store.boundaries[entry.boundary]
  return ring ? { coordinates: ring } : null
}

/**
 * A commitment as the pages show it (see partials/commitment-details.md):
 * dates written out, address lines apart, the boundary ready for `:::map`
 */
function commitmentOf(entry, store) {
  const address = [].concat(entry.address || [])
  return {
    reference: entry.reference,
    developer: entry.developer,
    address: {
      line1: address[0] || '',
      line2: address[1] || '',
      line3: address[2] || '',
      line4: address[3] || ''
    },
    planningType: entry.planningType,
    units: entry.units,
    edp: entry.edp,
    levyAmount: entry.levyAmount,
    issued: formatDate(entry.issued),
    expires: formatDate(entry.expires),
    boundary: boundaryOf(entry, store)
  }
}

/**
 * A status as the pages show it. `value` is what the record stores (the
 * radio it ticks); `shown` is the status of the tables, tags and filter,
 * which differs for one with `shownAs` in records.yaml
 */
function statusOf(value, store) {
  const status = store.statuses[value] || {}
  const shown = status.shownAs || value
  const look = store.statuses[shown] || status
  return {
    value,
    shown,
    label: look.label || shown,
    colour: look.colour || 'grey'
  }
}

// An officer's email on the history: records.yaml's `officers`, or their
// name at the council's domain
function officerEmail(name, store) {
  if (!name) {
    return ''
  }
  const listed = store.officers[name]
  if (listed) {
    return listed
  }
  const local = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s-]/g, '')
    .replace(/\s+/g, '.')
  return local ? `${local}@${COUNCIL_DOMAIN}` : ''
}

// The email the officer signed in with, for the history of what they do
function signedInEmail(data) {
  return (data.officer && data.officer.email) || ''
}

/**
 * Every record the council has: the file's, then the ones the officer
 * added or changed this session (`lpaRecords`, keyed by NRL reference),
 * which win. Each is { reference, source (the commitment entry), record }.
 */
function allEntries(data) {
  const store = loadStore()
  const byReference = new Map()
  const newCouncil = Boolean(data && data.officer && data.officer.newCouncil)
  for (const entry of store.commitments) {
    if (entry.record && !newCouncil) {
      byReference.set(entry.reference, { entry, record: entry.record })
    }
  }
  for (const [reference, saved] of Object.entries(
    (data && data.lpaRecords) || {}
  )) {
    byReference.set(reference, { entry: saved.commitment, record: saved })
  }
  return [...byReference.values()]
}

// "Full" for "Full planning permission": the tables' short name
function planningTypeShort(planningType, store) {
  return store.planningTypes[planningType] || planningType || ''
}

function planningStageOf(value, store) {
  return { value, label: store.planningStages[value] || value }
}

/**
 * A record as the pages show it: its commitment, status tag, planning
 * application stage, who added and last reviewed it, and its audit
 * timeline, newest first
 */
function recordOf({ entry, record }, store, today = new Date()) {
  const history = (record.history || []).map((event) => ({
    ...event,
    date: toDate(event.at)
  }))
  const last = history[history.length - 1]
  const reviews = history.filter((event) => event.event === 'status')
  const lastReview = reviews[reviews.length - 1]
  const expires = toDate(entry.expires)
  return {
    reference: entry.reference,
    developer: entry.developer,
    planningReference: record.planningReference,
    // A planning variation: one added here keeps the planning reference
    // the record was added with; one the developer made names the original
    // application's commitment
    variation: Boolean(
      record.originalPlanningReference || entry.originalReference
    ),
    originalReference: entry.originalReference || '',
    originalPlanningReference: record.originalPlanningReference || '',
    planningStage: planningStageOf(record.planningStage || ADDED_STAGE, store),
    reservedMatters: (record.reservedMatters || []).map((item) => ({
      reference: item.reference,
      status: planningStageOf(item.status || ADDED_STAGE, store),
      description: item.description || ''
    })),
    planningType: entry.planningType,
    planningTypeShort: planningTypeShort(entry.planningType, store),
    overdue: Boolean(record.overdue),
    officer: record.officer,
    status: statusOf(record.status || ADDED_STATUS, store),
    reviewedBy: lastReview ? lastReview.by : '',
    lastModified: last ? last.date : null,
    lastModifiedShort: last ? formatDate(last.date, 'short') : '',
    expires,
    expiresShort: formatDate(expires, 'short'),
    expired: Boolean(expires && expires < today),
    timeline: history
      .map((event) => ({
        event: event.event,
        status: event.status ? statusOf(event.status, store) : null,
        stage: event.stage ? planningStageOf(event.stage, store) : null,
        planningReference: event.planningReference || '',
        reason: event.reason || '',
        comment: event.comment || '',
        by: event.by,
        email: event.email || officerEmail(event.by, store),
        date: formatDate(event.date),
        time: formatTime(event.date),
        datetime: event.date ? event.date.toISOString() : ''
      }))
      .reverse(),
    commitment: commitmentOf(entry, store)
  }
}

/**
 * The records a record is linked to: the original application's, for a
 * commitment the developer made for a variation, and every variation's
 * that names this one. Each is { reference, relation, recorded } (relation
 * `original` or `variation`; `recorded` when the council has that record,
 * so the page can link to it).
 */
function linkedRecords(data, record) {
  const entries = allEntries(data)
  const links = []
  if (record.originalReference) {
    links.push({
      reference: record.originalReference,
      relation: 'original',
      recorded: entries.some(
        (item) => item.entry.reference === record.originalReference
      )
    })
  }
  for (const item of entries) {
    if (item.entry.originalReference === record.reference) {
      links.push({
        reference: item.entry.reference,
        relation: 'variation',
        recorded: true
      })
    }
  }
  return links
}

function allRecords(data) {
  const store = loadStore()
  return allEntries(data).map((item) => recordOf(item, store))
}

function findRecord(data, reference) {
  const store = loadStore()
  const found = allEntries(data).find(
    (item) => item.entry.reference === reference
  )
  return found ? recordOf(found, store) : null
}

/**
 * The commitment an NRL reference retrieves: one in records.yaml, the one
 * made in nrf-request-to-use-1 this session, or (when the file has one)
 * the fallback wearing the reference typed. Null when there is none.
 */
function findCommitmentEntry(data, reference) {
  const store = loadStore()
  const listed = store.commitments.find(
    (entry) => entry.reference === reference
  )
  if (listed) {
    return listed
  }
  if (data.nrlReference && String(data.nrlReference) === reference) {
    return requestToUseEntry(data)
  }
  if (store.fallback) {
    const issued = new Date()
    return {
      ...store.fallback,
      reference,
      issued: store.fallback.issued || isoDate(issued),
      expires: store.fallback.expires || isoDate(addMonths(issued, 6))
    }
  }
  return null
}

// The commitment the developer submitted in nrf-request-to-use-1, from the
// answers that journey left in the session
function requestToUseEntry(data) {
  const developer = data.developerDetails || data.yourAddress || {}
  const account = data.account || {}
  const certificate = data.certificate || {}
  const polygon = data.redlineBoundaryPolygon || {}
  const planningTypes = { full: 'Full planning permission' }
  return {
    reference: String(data.nrlReference),
    developer:
      account.businessName || developer.fullName || account.fullName || '',
    address: [
      developer.addressLine1,
      developer.addressLine2,
      developer.town,
      developer.postcode
    ].filter(Boolean),
    planningType: planningTypes[data.planningType] || data.planningType,
    units: data.residentialBuildingCount,
    edp: data.edpName || polygon.intersectingCatchment,
    levyAmount: data.levyAmount,
    // A variation of an application that already has a commitment
    originalReference:
      data.isVariation === 'Yes' && data.originalCommitted === 'Yes'
        ? String(data.originalReference || '')
            .trim()
            .toUpperCase()
        : '',
    issued: certificate.issueDate || new Date(),
    expires: certificate.expiryDate || addMonths(new Date(), 6),
    boundary: polygon.coordinates ? { coordinates: polygon.coordinates } : null
  }
}

// ------------------------------------------------------- Tables and search

const byText = (field) => (a, b) =>
  String(field(a) || '').localeCompare(String(field(b) || ''))
const byDate = (field) => (a, b) => (field(a) || 0) - (field(b) || 0)

// The tables' columns in order: each one's key in the page's `text.columns`
// and how sorting by it compares two records (ascending)
const COLUMNS = [
  { key: 'reference', compare: byText((r) => r.reference) },
  { key: 'developer', compare: byText((r) => r.developer) },
  { key: 'stage', compare: byText((r) => r.planningStage.label) },
  { key: 'planningType', compare: byText((r) => r.planningTypeShort) },
  { key: 'officer', compare: byText((r) => r.officer) },
  { key: 'lastModified', compare: byDate((r) => r.lastModified) },
  { key: 'expires', compare: byDate((r) => r.expires) },
  { key: 'status', compare: byText((r) => r.status.label) }
]
const DEFAULT_SORT = 'lastModified'
const DEFAULT_DIR = 'desc'
const newestFirst = (a, b) => (b.lastModified || 0) - (a.lastModified || 0)

// The filters' checkbox groups: each one's query key and the values it can
// take, with their labels, from records.yaml
const FILTERS = ['status', 'stage', 'type']

function filterOptions(store) {
  const types = [...new Set(Object.values(store.planningTypes))]
  return {
    status: Object.entries(store.statuses)
      .filter(([, status]) => !status.shownAs)
      .map(([value, status]) => ({ value, text: status.label || value })),
    stage: Object.entries(store.planningStages).map(([value, label]) => ({
      value,
      text: label
    })),
    type: types.map((label) => ({ value: label.toLowerCase(), text: label }))
  }
}

// What each filter compares a record by
const FILTER_VALUES = {
  status: (record) => record.status.shown,
  stage: (record) => record.planningStage.value,
  type: (record) => record.planningTypeShort.toLowerCase()
}

function sortRecords(records, query) {
  const column = COLUMNS.find((c) => c.key === query.sort)
  // Newest first breaks ties (the sort is stable)
  const sorted = records.slice().sort(newestFirst)
  if (!column) {
    return sorted
  }
  const sign = query.dir === 'asc' ? 1 : -1
  return sorted.sort((a, b) => sign * column.compare(a, b))
}

// Rows of govukTable for the records, with the page's own column copy.
// `headFor` makes a column heading sortable.
function tableFor(records, text, journey, headFor) {
  const viewPath = journey.routes.VIEW_RECORD
  const columns = text.columns || {}
  return {
    head: COLUMNS.map((column) => {
      const label = columns[column.key] || column.key
      return headFor ? headFor(column.key, label) : { text: label }
    }),
    rows: records.map((record) => [
      {
        html:
          `<a class="govuk-link govuk-link--no-visited-state govuk-!-font-weight-bold" ` +
          `href="${viewPath}?ref=${encodeURIComponent(record.reference)}">` +
          `${escapeHtml(record.reference)}</a>`
      },
      { text: record.developer },
      { text: record.planningStage.label },
      { text: record.planningTypeShort },
      { text: record.officer },
      { text: record.lastModifiedShort },
      { text: record.expiresShort },
      {
        html:
          `<strong class="govuk-tag govuk-tag--${escapeHtml(record.status.colour)}">` +
          `${escapeHtml(record.status.label)}</strong>`
      }
    ])
  }
}

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Search matches the NRL reference, developer, planning reference or
// officer, ignoring case and spaces
function matches(record, query) {
  const wanted = query.toLowerCase().replace(/\s+/g, '')
  if (!wanted) {
    return true
  }
  return [
    record.reference,
    record.developer,
    record.planningReference,
    record.originalPlanningReference,
    ...record.reservedMatters.map((item) => item.reference),
    record.officer
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .includes(wanted)
  )
}

function matchesFilters(record, query) {
  if (query.overdue && !record.overdue) {
    return false
  }
  return FILTERS.every(
    (name) =>
      !query[name].length || query[name].includes(FILTER_VALUES[name](record))
  )
}

// The records table with nothing searched, filtered or sorted
function blankQuery() {
  return {
    q: '',
    sort: DEFAULT_SORT,
    dir: DEFAULT_DIR,
    page: 1,
    status: [],
    stage: [],
    type: [],
    overdue: false
  }
}

// ?_q=, ?_sort=, ?_dir=, ?_page=, ?_status=, ?_stage=, ?_type= and
// ?_overdue= (the kit never keeps a query key starting with `_` in the
// session, so a search never follows the officer around). Values no
// filter offers are dropped.
function queryOf(ctx, store) {
  const raw = ctx.query || {}
  const options = filterOptions(store)
  const pick = (name) => {
    const allowed = new Set(options[name].map((option) => option.value))
    return [...new Set([].concat(raw[`_${name}`] || []).map(String))].filter(
      (value) => allowed.has(value)
    )
  }
  const page = parseInt(raw._page, 10)
  const sort = COLUMNS.some((column) => column.key === raw._sort)
    ? String(raw._sort)
    : DEFAULT_SORT
  const dir = ['asc', 'desc'].includes(raw._dir)
    ? raw._dir
    : sort === DEFAULT_SORT
      ? DEFAULT_DIR
      : 'asc'
  return {
    ...blankQuery(),
    q: String(raw._q || '').trim(),
    sort,
    dir,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    status: pick('status'),
    stage: pick('stage'),
    type: pick('type'),
    overdue: [].concat(raw._overdue || []).includes('1')
  }
}

// A link to the records table showing `query` with `changes` made to it
function hrefFor(path, query, changes = {}) {
  const next = { ...query, ...changes }
  const params = new URLSearchParams()
  if (next.q) {
    params.set('_q', next.q)
  }
  for (const name of FILTERS) {
    for (const value of next[name]) {
      params.append(`_${name}`, value)
    }
  }
  if (next.overdue) {
    params.set('_overdue', '1')
  }
  if (next.sort !== DEFAULT_SORT || next.dir !== DEFAULT_DIR) {
    params.set('_sort', next.sort)
    params.set('_dir', next.dir)
  }
  if (next.page > 1) {
    params.set('_page', String(next.page))
  }
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

/**
 * govukPagination for the records table: every page number when there are
 * few, otherwise the first, the last and those either side of the current
 * one with ellipses between. Each link keeps the search, filters and sort.
 */
function paginationFor(query, pages, path) {
  if (pages < 2) {
    return null
  }
  const href = (page) => hrefFor(path, query, { page })
  const items = []
  for (let page = 1; page <= pages; page += 1) {
    const near = Math.abs(page - query.page) <= 1
    if (page === 1 || page === pages || near) {
      items.push({
        number: page,
        href: href(page),
        current: page === query.page
      })
    } else if (!items[items.length - 1].ellipsis) {
      items.push({ ellipsis: true })
    }
  }
  return {
    items,
    previous: query.page > 1 ? { href: href(query.page - 1) } : null,
    next: query.page < pages ? { href: href(query.page + 1) } : null
  }
}

// A column heading that sorts the table by it: ascending first, then the
// other way each time it is chosen again. The sort starts at page 1.
function sortableHead(query, path) {
  return (key, label) => {
    const current = query.sort === key
    const dir = current && query.dir === 'asc' ? 'desc' : 'asc'
    return {
      html:
        `<a class="app-sort-link" href="${escapeHtml(hrefFor(path, query, { sort: key, dir, page: 1 }))}">` +
        `${escapeHtml(label)}</a>`,
      attributes: {
        'aria-sort': current
          ? query.dir === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    }
  }
}

// The filter's checkbox groups, and how many filters are set
function filtersFor(query, text, store, path) {
  const options = filterOptions(store)
  const legends = {
    status: text.filterStatus,
    stage: text.filterStage,
    type: text.filterType
  }
  const groups = FILTERS.map((name) => ({
    name: `_${name}`,
    legend: legends[name],
    items: options[name].map((option) => ({
      ...option,
      checked: query[name].includes(option.value)
    }))
  }))
  // One for each box ticked, shown beside the details' summary
  const count =
    FILTERS.reduce((total, name) => total + query[name].length, 0) +
    (query.overdue ? 1 : 0)
  return {
    groups,
    count,
    // Clear filters keeps the search and the sort
    clearHref: hrefFor(path, {
      ...blankQuery(),
      q: query.q,
      sort: query.sort,
      dir: query.dir
    })
  }
}

// ------------------------------------------------------------ Page hooks

// Signing in: the officer is the participant, or the stand-in
const oneLoginSignIn = {
  process(ctx) {
    const { data } = ctx
    delete data._password
    const email = String(data.signInEmail || '').trim()
    data.officer = {
      fullName: participantOf(data).fullName || MOCK_OFFICER,
      email,
      newCouncil: email.toLowerCase().includes(NEW_COUNCIL)
    }
    // journey.yaml sends an officer with no records to "Enter an NRL
    // reference" rather than the dashboard
    data.officer.hasRecords = allEntries(data).length > 0
  }
}

// A live scenario from the tools page (`live: true` in journey.yaml) starts
// signed in, as the participant or the stand-in, with the email the
// scenario gives or the stand-in's
function scenario(ctx) {
  const { data } = ctx
  data.signInEmail = data.signInEmail || officerEmail(MOCK_OFFICER, loadStore())
  oneLoginSignIn.process(ctx)
}

// Sign out, registered once at boot; the header's `$signOut` link. It
// returns to the start page.
const signOut = {
  routes(router, journey) {
    const routes = { SIGN_OUT: `${journey.basePath}/sign-out` }
    router.get(routes.SIGN_OUT, (req, res) => {
      const data = (req.session && req.session.data) || {}
      for (const key of SESSION_KEYS) {
        delete data[key]
      }
      res.redirect(`${journey.basePath}/start`)
    })
    return routes
  }
}

// "Retrieve commitment details": NRL-123456 (or just the six digits). One
// the council already has a record for asks whether it is a planning
// variation (journey.yaml) rather than adding it again.
const retrieveCommitment = {
  // With no records there is no dashboard to go back to
  get(ctx, model) {
    if (!ctx.preview && !allEntries(ctx.data).length) {
      model.backLink = null
    }
  },
  validate(ctx) {
    const { page, body, data } = ctx
    const typed = String(body[page.field] || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '')
    if (!typed) {
      return { ok: false, error: message(page, 'required') }
    }
    const reference = /^\d{6}$/.test(typed) ? `NRL-${typed}` : typed
    if (!REFERENCE.test(reference)) {
      return { ok: false, error: message(page, 'format') }
    }
    if (!findRecord(data, reference) && !findCommitmentEntry(data, reference)) {
      return { ok: false, error: message(page, 'notFound') }
    }
    return { ok: true, value: reference }
  },
  process(ctx, reference) {
    const { data } = ctx
    const recorded = findRecord(data, reference)
    const entry = recorded
      ? allEntries(data).find((item) => item.entry.reference === reference)
          .entry
      : findCommitmentEntry(data, reference)
    data.commitmentEntry = entry
    data.commitment = commitmentOf(entry, loadStore())
    data.commitmentRecorded = Boolean(recorded)
    delete data.planningVariation
    if (recorded) {
      data.record = recorded
    }
  }
}

// "Is this a planning variation?" for a commitment the council already has
// a record for. No returns to "Enter an NRL reference", which still holds
// the reference typed so the officer can correct it.
const planningVariation = {
  process(ctx, answer) {
    const { data } = ctx
    if (answer !== IS_VARIATION) {
      for (const key of [
        'commitmentEntry',
        'commitmentRecorded',
        'planningVariation'
      ]) {
        delete data[key]
      }
    }
  }
}

// The new planning application reference for a planning variation: the
// record takes it, keeps the one it was added with (only the first, if it
// is varied again) and starts its new application at Applied
const addVariation = {
  validate(ctx) {
    const { page, body, data } = ctx
    const typed = String(body[page.field] || '').trim()
    if (!typed) {
      return { ok: false, error: message(page, 'required') }
    }
    const found = data.commitmentEntry
      ? findRecord(data, data.commitmentEntry.reference)
      : null
    if (
      found &&
      typed.replace(/\s+/g, '').toUpperCase() ===
        String(found.planningReference || '')
          .replace(/\s+/g, '')
          .toUpperCase()
    ) {
      return { ok: false, error: message(page, 'same') }
    }
    return { ok: true, value: typed }
  },
  process(ctx, reference) {
    const { data } = ctx
    const entry = data.commitmentEntry
    const found = entry
      ? allEntries(data).find(
          (item) => item.entry.reference === entry.reference
        )
      : null
    if (!found) {
      return { redirect: ctx.journey.routes.RETRIEVE_COMMITMENT }
    }
    const { record } = found
    updateRecord(
      data,
      found,
      {
        planningReference: reference,
        originalPlanningReference:
          record.originalPlanningReference || record.planningReference,
        planningStage: ADDED_STAGE
      },
      { event: 'variation', planningReference: reference }
    )
    data.recordReference = entry.reference
    data.lpaFlash = 'variation'
    for (const key of [
      'commitmentReference',
      'commitmentEntry',
      'commitmentRecorded',
      'planningVariation',
      'planningVariationReference'
    ]) {
      delete data[key]
    }
    return {
      redirect: `${ctx.journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(entry.reference)}`
    }
  }
}

// The planning application reference: continuing adds the commitment to
// the council's records, added by the officer now, and the record page
// says so
const addRecord = {
  process(ctx) {
    const { data } = ctx
    const entry = data.commitmentEntry
    if (!entry) {
      return { redirect: ctx.journey.routes.RETRIEVE_COMMITMENT }
    }
    const officer = (data.officer && data.officer.fullName) || MOCK_OFFICER
    const email = signedInEmail(data)
    data.lpaRecords = data.lpaRecords || {}
    data.lpaRecords[entry.reference] = {
      commitment: entry,
      planningReference: data.planningReference,
      planningStage: ADDED_STAGE,
      officer,
      status: ADDED_STATUS,
      history: [{ event: 'added', by: officer, email, at: nowStamp() }]
    }
    data.recordReference = entry.reference
    if (data.officer) {
      data.officer.hasRecords = true
    }
    // A variation the developer made a commitment for says which existing
    // record it is linked with
    const original = entry.originalReference
    if (original && findRecord(data, original)) {
      data.lpaFlash = 'linked'
      data.lpaFlashReference = original
    } else {
      data.lpaFlash = 'added'
    }
    // "Create a developer record" starts afresh
    for (const key of [
      'commitmentReference',
      'commitmentEntry',
      'planningReference'
    ]) {
      delete data[key]
    }
    return {
      redirect: `${ctx.journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(entry.reference)}`
    }
  }
}

// The record ?ref=NRL-123456 picks, or the one last on screen, for the
// record page and its certificate. It is remembered for the status radios.
function loadRecord(ctx) {
  const { data, query } = ctx
  const reference = String(query.ref || data.recordReference || '')
  delete data.ref
  const record = reference ? findRecord(data, reference) : null
  if (!record) {
    return ctx.preview ? null : { redirect: ctx.journey.routes.DASHBOARD }
  }
  data.recordReference = reference
  data.record = record
  data.commitment = record.commitment
  return null
}

// The record page's linked records, and "NRL-101178 (original planning
// application)" for its linked record row, which viewRecord.get turns into
// links
function withLinks(data, page) {
  if (!data.record) {
    return
  }
  const text = page.content.text || {}
  const labels = {
    original: text.linkedOriginal,
    variation: text.linkedVariation
  }
  data.record.links = linkedRecords(data, data.record).map((link) => ({
    ...link,
    label: labels[link.relation] || link.relation
  }))
  data.record.linkedText = data.record.links
    .map((link) => `${link.reference} (${link.label})`)
    .join(', ')
}

// Which review options a record offers: the first step's (options with no
// `step`) until its commitment details are reviewed, then the planning
// application stages (`step: planning`), and once the permission is
// granted the granted options (`step: granted`)
function stepOf(record) {
  if (!record || record.status.value !== REVIEWED_STATUS) {
    return ''
  }
  return record.planningStage.value === GRANTED_STAGE
    ? GRANTED_STEP
    : PLANNING_STEP
}

// A granted outline application whose commitment details are reviewed
// takes reserved matters
function takesReservedMatters(record) {
  return Boolean(
    record &&
      record.planningType === OUTLINE_TYPE &&
      stepOf(record) === GRANTED_STEP
  )
}

// The record's reserved matters as one line, for the planning details row
// (which only shows when there are some); viewRecord.get swaps it for a list
function withReservedMatters(data) {
  if (data.record) {
    data.record.reservedMattersText = data.record.reservedMatters
      .map((item) => item.reference)
      .join(', ')
  }
}

function reservedMattersHtml(record) {
  const items = record.reservedMatters.map(
    (item) =>
      `<li><span class="govuk-!-font-weight-bold">${escapeHtml(item.reference)}</span>` +
      ` (${escapeHtml(item.status.label)})` +
      (item.description ? `<br>${escapeHtml(item.description)}` : '') +
      '</li>'
  )
  const spaced = items.length > 1 ? ' govuk-list--spaced' : ''
  return `<ul class="govuk-list${spaced}">${items.join('')}</ul>`
}

// Reference typed, ignoring case and spaces
function sameReference(a, b) {
  const plain = (value) =>
    String(value || '')
      .replace(/\s+/g, '')
      .toUpperCase()
  return plain(a) === plain(b)
}

/**
 * The add-reserved-matters page's form, its status radios the planning
 * stages in records.yaml. Null for a record that takes none.
 */
function reservedMattersModel(ctx, record, { values = {}, errors = [] }) {
  if (!takesReservedMatters(record)) {
    return null
  }
  const routes = ctx.journey.routes
  const ref = `?ref=${encodeURIComponent(record.reference)}`
  const store = loadStore()
  const errorFor = {}
  for (const item of errors) {
    errorFor[item.field] = item.message
  }
  return {
    action: `${routes.ADD_RESERVED_MATTERS}${ref}`,
    // Cancel
    recordHref: `${routes.VIEW_RECORD}${ref}`,
    fields: RESERVED_MATTERS_FIELDS,
    limit: DESCRIPTION_LIMIT,
    values,
    errors: errorFor,
    statuses: Object.entries(store.planningStages).map(([value, label]) => ({
      value,
      text: label,
      checked: values.status === value
    }))
  }
}

// What the officer typed into the reserved matters form, and what is wrong
// with it (one problem per field, in the form's order)
function checkReservedMatters(page, body, record) {
  const store = loadStore()
  const values = {}
  for (const [name, field] of Object.entries(RESERVED_MATTERS_FIELDS)) {
    values[name] = String(body[field] || '').trim()
  }
  const errors = []
  const problem = (name, key) =>
    errors.push({
      field: RESERVED_MATTERS_FIELDS[name],
      message: message(page, key)
    })
  if (!values.reference) {
    problem('reference', 'reservedMattersReferenceRequired')
  } else if (
    record.reservedMatters.some((item) =>
      sameReference(item.reference, values.reference)
    ) ||
    sameReference(record.planningReference, values.reference)
  ) {
    problem('reference', 'reservedMattersReferenceAdded')
  }
  if (!(values.status in store.planningStages)) {
    values.status = ''
    problem('status', 'reservedMattersStatusRequired')
  }
  if (!values.description) {
    problem('description', 'reservedMattersDescriptionRequired')
  } else if (values.description.length > DESCRIPTION_LIMIT) {
    problem('description', 'reservedMattersDescriptionTooLong')
  }
  return { values, errors }
}

// The screen wall's reserved matters errors: which field each belongs to
const RESERVED_MATTERS_ERRORS = {
  reservedMattersReferenceRequired: RESERVED_MATTERS_FIELDS.reference,
  reservedMattersReferenceAdded: RESERVED_MATTERS_FIELDS.reference,
  reservedMattersStatusRequired: RESERVED_MATTERS_FIELDS.status,
  reservedMattersDescriptionRequired: RESERVED_MATTERS_FIELDS.description,
  reservedMattersDescriptionTooLong: RESERVED_MATTERS_FIELDS.description
}

// The options for the record's step; Add reserved matters only for an
// outline application
function optionsFor(page, record) {
  const step = stepOf(record)
  return page.content.options.filter(
    (option) =>
      (option.step || '') === step &&
      (option.value !== RESERVED_MATTERS || takesReservedMatters(record))
  )
}

// The error for no option chosen, by step
const REQUIRED_ERRORS = {
  '': 'required',
  [PLANNING_STEP]: 'stageRequired',
  [GRANTED_STEP]: 'grantedRequired'
}

// Writes a change to a record: its new fields and the event for its
// history, by the officer now
function updateRecord(data, found, changes, event) {
  const officer = (data.officer && data.officer.fullName) || MOCK_OFFICER
  const { record } = found
  data.lpaRecords = data.lpaRecords || {}
  data.lpaRecords[found.entry.reference] = {
    ...record,
    ...changes,
    commitment: found.entry,
    history: [
      ...(record.history || []),
      { ...event, by: officer, email: signedInEmail(data), at: nowStamp() }
    ]
  }
  data.lpaFlash = 'updated'
}

// The record page's success banners: the `text:` keys of each one's title
// and words ({reference} is lpaFlashReference)
const FLASHES = {
  added: { title: 'successTitle', text: 'added' },
  linked: { title: 'successTitle', text: 'addedLinked' },
  variation: { title: 'variationAddedTitle', text: 'variationAdded' },
  [RESERVED_MATTERS]: {
    title: 'reservedMattersAddedTitle',
    text: 'reservedMattersAdded'
  }
}

// The record page: a flash message says a record was just added. The
// review options open with none chosen and post back here; Confirm returns
// to the dashboard, which says the record was updated. Reviewing the
// details later keeps the record For review and notes it on the timeline;
// reviewing them moves it on to its planning application's stage, and
// choosing the stage it is at already changes nothing. Rejecting asks why
// on reject-commitment and is final: a rejected record shows a warning in
// place of the radios, and a post for it changes nothing. Once the
// permission is granted, judicial review sets the stage, Add reserved
// matters opens the add-reserved-matters page and the placeholder changes
// nothing.
const viewRecord = {
  // The page showing "Select ..." offers only the record's options too
  getOnError: true,
  // The add-reserved-matters page's form posts here; errors show on that
  // page, and saving returns to the record, which says so
  routes(router, journey) {
    const routes = {
      ADD_RESERVED_MATTERS: `${journey.basePath}/add-reserved-matters`
    }
    router.post(routes.ADD_RESERVED_MATTERS, (req, res, next) => {
      try {
        addReservedMatters(req, res, loadJourney(journey.id))
      } catch (error) {
        next(error)
      }
    })
    return routes
  },
  load(ctx) {
    // The screen wall's stage error needs a record past its review, and
    // its granted error a granted one
    const errorStep = {
      stageRequired: PLANNING_STEP,
      grantedRequired: GRANTED_STEP
    }[ctx.preview && ctx.previewError]
    if (errorStep) {
      const shown = allRecords(ctx.data).find(
        (record) => stepOf(record) === errorStep
      )
      if (shown) {
        ctx.data.recordReference = shown.reference
      }
    }
    const redirect = loadRecord(ctx)
    if (redirect) {
      return redirect
    }
    const { data } = ctx
    // The kit keeps the last post's field in the session
    delete data[ctx.page.field]
    if (!ctx.preview) {
      delete data.newStatus
    }
    withLinks(data, ctx.page)
    withReservedMatters(data)
  },
  get(ctx, model) {
    const { data, page } = ctx
    // Each linked record the council has opens its page, and the reserved
    // matters are a list
    const links = (data.record && data.record.links) || []
    const reservedMatters =
      (data.record && data.record.reservedMattersText) || ''
    for (const group of model.content.rowGroups || []) {
      for (const row of group.rows) {
        if (reservedMatters && row.value.text === reservedMatters) {
          row.value = { html: reservedMattersHtml(data.record) }
        }
        if (links.length && row.value.text === data.record.linkedText) {
          row.value = {
            html: links
              .map((link) => {
                const reference = escapeHtml(link.reference)
                const shown = link.recorded
                  ? `<a class="govuk-link" href="${ctx.journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(link.reference)}">${reference}</a>`
                  : reference
                return `${shown} (${escapeHtml(link.label)})`
              })
              .join('<br>')
          }
        }
      }
    }
    const flash = FLASHES[data.lpaFlash]
    if (flash) {
      const text = model.content.text
      model.flash = data.lpaFlash
      model.flashTitle = text[flash.title]
      model.flashText = String(text[flash.text] || '').replace(
        '{reference}',
        String(data.lpaFlashReference || '')
      )
    }
    delete data.lpaFlash
    delete data.lpaFlashReference
    // The items line up with the page's options
    const offered = new Set(optionsFor(page, data.record))
    model.content.items = model.content.items.filter((item, index) =>
      offered.has(page.content.options[index])
    )
    // The planning stages and the granted options share a legend; only
    // the stages have the hint
    const step = stepOf(data.record)
    model.planningStep = step === PLANNING_STEP || step === GRANTED_STEP
    model.stageHint = step === PLANNING_STEP
    // The screen wall's error states, as a post would show them
    if (ctx.preview && ctx.previewError) {
      model.errors = [
        { field: page.field, message: message(page, ctx.previewError) }
      ]
    }
  },
  // `load` does not run before a post, so the record is found again here
  // for the page to show with any error
  validate(ctx) {
    const { page, body, data } = ctx
    data.record = data.recordReference
      ? findRecord(data, data.recordReference)
      : null
    if (!data.record) {
      return { ok: true }
    }
    withLinks(data, page)
    withReservedMatters(data)
    data.commitment = data.record.commitment
    if (data.record.status.value === REJECTED_STATUS) {
      return { ok: true, value: null }
    }
    const choice = String(body[page.field] || '')
    data.newStatus = choice
    const step = stepOf(data.record)
    const allowed = optionsFor(page, data.record).map((option) =>
      String(option.value)
    )
    if (!allowed.includes(choice)) {
      return {
        ok: false,
        errors: [
          { field: page.field, message: message(page, REQUIRED_ERRORS[step]) }
        ]
      }
    }
    return { ok: true, value: { step, choice } }
  },
  process(ctx, value) {
    const { data } = ctx
    const reference = data.recordReference
    const found = allEntries(data).find(
      (item) => item.entry.reference === reference
    )
    delete data.newStatus
    delete data[ctx.page.field]
    const dashboardPath = ctx.journey.routes.DASHBOARD
    if (!found || !value) {
      return { redirect: dashboardPath }
    }
    if (value.choice === REJECTED_STATUS) {
      delete data.rejectReason
      return { redirect: ctx.journey.routes.REJECT_COMMITMENT }
    }
    if (value.choice === RESERVED_MATTERS) {
      return {
        redirect: `${ctx.journey.routes.ADD_RESERVED_MATTERS}?ref=${encodeURIComponent(reference)}`
      }
    }
    if (value.choice === PLACEHOLDER_OPTION) {
      return { redirect: dashboardPath }
    }
    const record = found.record
    const changes = {}
    let event
    if (value.step === PLANNING_STEP || value.step === GRANTED_STEP) {
      if ((record.planningStage || ADDED_STAGE) === value.choice) {
        return { redirect: dashboardPath }
      }
      changes.planningStage = value.choice
      event = { event: 'stage', stage: value.choice }
    } else if (value.choice === REVIEW_LATER) {
      event = { event: REVIEW_LATER }
    } else {
      changes.status = value.choice
      event = { event: 'status', status: value.choice }
    }
    updateRecord(data, found, changes, event)
    return { redirect: dashboardPath }
  }
}

// The add-reserved-matters page's form: each reserved matters application
// the officer saves joins the record's reserved matters and its history,
// and the record page says so. A problem shows the page again with the
// officer's answers kept.
function addReservedMatters(req, res, journey) {
  const page = journey.byId.get('add-reserved-matters')
  const ctx = buildContext(req, res, journey, page, { isPost: true })
  const redirect = loadRecord(ctx)
  if (redirect) {
    return res.redirect(303, redirect.redirect)
  }
  const { data } = ctx
  const recordPath = `${journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(data.record.reference)}`
  // The kit keeps the post's fields in the session
  for (const field of Object.values(RESERVED_MATTERS_FIELDS)) {
    delete data[field]
  }
  const found = allEntries(data).find(
    (item) => item.entry.reference === data.record.reference
  )
  if (!found || !takesReservedMatters(data.record)) {
    return res.redirect(303, recordPath)
  }
  const { values, errors } = checkReservedMatters(page, ctx.body, data.record)
  if (errors.length) {
    const model = buildModel(ctx, { errors })
    addReservedMattersPage.get(ctx, model, { values, errors })
    return res.render(page.template, model)
  }
  updateRecord(
    data,
    found,
    {
      reservedMatters: [
        ...(found.record.reservedMatters || []),
        {
          reference: values.reference,
          status: values.status,
          description: values.description
        }
      ]
    },
    { event: RESERVED_MATTERS, planningReference: values.reference }
  )
  data.lpaFlash = RESERVED_MATTERS
  data.lpaFlashReference = values.reference
  req.session.save(() => res.redirect(303, recordPath))
}

// Why the commitment details are rejected: a reason and an optional
// comment, both on the record's history. Confirm rejects the record for
// good and returns to the dashboard. A record already rejected (or gone)
// goes straight back there.
const rejectCommitment = {
  load(ctx) {
    const redirect = loadRecord(ctx)
    if (redirect) {
      return redirect
    }
    const { data } = ctx
    delete data[COMMENT_FIELD]
    if (!ctx.preview && data.record.status.value === REJECTED_STATUS) {
      return { redirect: ctx.journey.routes.DASHBOARD }
    }
  },
  process(ctx, reason) {
    const { data, page, body } = ctx
    const comment = String(body[COMMENT_FIELD] || '').trim()
    delete data[COMMENT_FIELD]
    delete data.rejectReason
    const found = allEntries(data).find(
      (item) => item.entry.reference === data.recordReference
    )
    if (!found || (found.record.status || ADDED_STATUS) === REJECTED_STATUS) {
      return { redirect: ctx.journey.routes.DASHBOARD }
    }
    // The history shows the reason as the officer read it
    const option = page.content.options.find(
      (item) => String(item.value) === String(reason)
    )
    const event = { event: 'status', status: REJECTED_STATUS }
    if (option) {
      event.reason = option.label
    }
    if (comment) {
      event.comment = comment
    }
    updateRecord(data, found, { status: REJECTED_STATUS }, event)
    return { redirect: ctx.journey.routes.DASHBOARD }
  }
}

// Every detail of a record's commitment, behind the record page
// Reserved matters on a page of their own, opened from the record's Add
// reserved matters option: add-reserved-matters?ref=NRL-100958, for a
// granted outline application only (any other record opens instead). Its
// form posts to this page's path, which viewRecord.routes handles.
const addReservedMattersPage = {
  load(ctx) {
    const redirect = loadRecord(ctx)
    if (redirect) {
      return redirect
    }
    const { data } = ctx
    for (const field of Object.values(RESERVED_MATTERS_FIELDS)) {
      delete data[field]
    }
    if (!ctx.preview && !takesReservedMatters(data.record)) {
      return {
        redirect: `${ctx.journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(data.record.reference)}`
      }
    }
  },
  get(ctx, model, form = {}) {
    let errors = form.errors || []
    // The screen wall's error states, as a post would show them
    if (ctx.preview && RESERVED_MATTERS_ERRORS[ctx.previewError]) {
      errors = [
        {
          field: RESERVED_MATTERS_ERRORS[ctx.previewError],
          message: message(ctx.page, ctx.previewError)
        }
      ]
      model.errors = errors
    }
    model.reservedMatters = reservedMattersModel(ctx, ctx.data.record, {
      values: form.values,
      errors
    })
  }
}

const certificate = {
  load: loadRecord
}

// The landing page: counts that open the table filtered to them, and
// every record, searched, filtered, sorted by its column headings and paged
const dashboard = {
  // A council with no records yet adds its first one instead
  load(ctx) {
    if (!ctx.preview && !allEntries(ctx.data).length) {
      return { redirect: ctx.journey.routes.RETRIEVE_COMMITMENT }
    }
  },
  get(ctx, model) {
    const store = loadStore()
    const { text } = model.content
    // After Confirm on a record page: "NRL-123456 has been updated"
    if (ctx.data.lpaFlash === 'updated') {
      model.flash = String(text.updated || '').replace(
        '{reference}',
        String(ctx.data.recordReference || '')
      )
      delete ctx.data.lpaFlash
    }
    const path = ctx.journey.routes.DASHBOARD
    const all = allRecords(ctx.data)
    // Each card counts the records the table shows with its filters set
    const card = (label, filters, test) => ({
      count: all.filter(test).length,
      label,
      href: hrefFor(path, blankQuery(), filters)
    })
    const isStatus = (status) => (r) => r.status.shown === status
    model.cards = [
      card(
        text.forReviewCount,
        { status: ['for-review'] },
        isStatus('for-review')
      ),
      card(text.rejectedCount, { status: ['rejected'] }, isStatus('rejected')),
      card(
        text.reviewedActiveCount,
        { status: ['reviewed'], stage: ['applied'] },
        (r) => isStatus('reviewed')(r) && r.planningStage.value === 'applied'
      ),
      card(text.overdueCount, { overdue: true }, (r) => r.overdue)
    ]

    const query = queryOf(ctx, store)
    const records = sortRecords(
      all.filter(
        (record) => matches(record, query.q) && matchesFilters(record, query)
      ),
      query
    )
    const pages = Math.max(1, Math.ceil(records.length / RECORDS_PER_PAGE))
    query.page = Math.min(query.page, pages)
    const from = (query.page - 1) * RECORDS_PER_PAGE
    const shown = records.slice(from, from + RECORDS_PER_PAGE)
    model.search = query
    model.resultCount = records.length
    // "Showing 11 to 14 of 14 records", from the page's `showing` text
    model.showing = String(text.showing || '')
      .replace('{from}', String(from + 1))
      .replace('{to}', String(from + shown.length))
      .replace('{total}', String(records.length))
    model.pagination = paginationFor(query, pages, path)
    model.filters = filtersFor(query, text, store, path)
    model.clearSearchHref = hrefFor(path, query, { q: '', page: 1 })
    model.table = tableFor(shown, text, ctx.journey, sortableHead(query, path))
  }
}

module.exports = {
  'one-login-email': signOut,
  'one-login-password': oneLoginSignIn,
  'retrieve-commitment': retrieveCommitment,
  'planning-reference': addRecord,
  'planning-variation': planningVariation,
  'planning-variation-reference': addVariation,
  'view-record': viewRecord,
  'reject-commitment': rejectCommitment,
  certificate,
  'add-reserved-matters': addReservedMattersPage,
  dashboard,
  // Journey-wide: a live scenario's sign in (see journey-engine/router.js)
  scenario,
  // For tests
  loadStore,
  allRecords,
  findRecord,
  findCommitmentEntry,
  linkedRecords,
  commitmentOf,
  MOCK_OFFICER,
  RECORDS_PER_PAGE
}
