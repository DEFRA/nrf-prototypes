/**
 * Hooks for the content-driven LPA journey "Manage commitments to the
 * nature restoration levy" (content/lpa-manage-1). The engine renders the
 * pages and follows journey.yaml; this file adds the bits that need code:
 *
 *   - the officer signing in with the mock GOV.UK One Login: the name the
 *     facilitator gave in the footer's "Participant details" box, or a
 *     stand-in, shown in the staff header over "Scarfolk Council"
 *   - a mock commitment store: content/lpa-manage-1/records.yaml holds the
 *     commitments developers have submitted and the records the council
 *     already has. Retrieving a reference finds it there, or the commitment
 *     made in nrf-request-to-use-1 this session, or the file's `fallback`
 *   - the records the officer adds, and every status they change, kept in
 *     the session (`lpaRecords`) over the file's own
 *   - the dashboard's counts and the records table, with search, filters
 *     and sortable columns
 *   - the record page's audit timeline and its review options, which post
 *     back to the page and return to the dashboard, and the full
 *     certificate behind it
 *
 * Nothing here is real: no passwords are checked or stored.
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { message } = require('../journey-engine/validation')
const { participantOf } = require('../nrf-request-to-use-1/hooks')

const RECORDS_FILE = path.join(
  __dirname,
  '../../../content/lpa-manage-1/records.yaml'
)
const REFERENCE = /^NRL-\d{6}$/
// Who is signed in when the facilitator has not given the participant's name
const MOCK_OFFICER = 'John Smith'
// How many records the dashboard's table shows, and the full table per page
const DASHBOARD_ROWS = 6
const RECORDS_PER_PAGE = 10
// The status of a record an officer has just added, and the stage of its
// planning application
const ADDED_STATUS = 'for-review'
const ADDED_STAGE = 'applied'
// The status that needs a comment, and the field the comment is in
const REJECTED_STATUS = 'rejected'
const COMMENT_FIELD = 'status-comment'
// Reviewing the commitment details moves a record on to its planning
// application's stage; putting it off keeps it For review
const REVIEWED_STATUS = 'reviewed'
const REVIEW_LATER = 'review-later'
const PLANNING_STEP = 'planning'
const SESSION_KEYS = ['officer', 'signInEmail']

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

/**
 * Every record the council has: the file's, then the ones the officer
 * added or changed this session (`lpaRecords`, keyed by NRL reference),
 * which win. Each is { reference, source (the commitment entry), record }.
 */
function allEntries(data) {
  const store = loadStore()
  const byReference = new Map()
  for (const entry of store.commitments) {
    if (entry.record) {
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
    planningStage: planningStageOf(record.planningStage || ADDED_STAGE, store),
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
        comment: event.comment || '',
        by: event.by,
        date: formatDate(event.date),
        time: formatTime(event.date),
        datetime: event.date ? event.date.toISOString() : ''
      }))
      .reverse(),
    commitment: commitmentOf(entry, store)
  }
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
// `headFor` makes a column heading sortable (the records page).
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
    data.officer = {
      fullName: participantOf(data).fullName || MOCK_OFFICER,
      email: data.signInEmail || ''
    }
  }
}

// Sign out, registered once at boot; the header's `$signOut` link
const signOut = {
  routes(router, journey) {
    const routes = { SIGN_OUT: `${journey.basePath}/sign-out` }
    router.get(routes.SIGN_OUT, (req, res) => {
      const data = (req.session && req.session.data) || {}
      for (const key of SESSION_KEYS) {
        delete data[key]
      }
      res.redirect(`${journey.basePath}/${journey.start}`)
    })
    return routes
  }
}

// "Retrieve commitment details": NRL-123456 (or just the six digits) that
// the council does not already have a record for
const retrieveCommitment = {
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
    if (findRecord(data, reference)) {
      return { ok: false, error: message(page, 'recorded') }
    }
    const entry = findCommitmentEntry(data, reference)
    if (!entry) {
      return { ok: false, error: message(page, 'notFound') }
    }
    return { ok: true, value: reference }
  },
  process(ctx, reference) {
    const { data } = ctx
    const entry = findCommitmentEntry(data, reference)
    data.commitmentEntry = entry
    data.commitment = commitmentOf(entry, loadStore())
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
    data.lpaRecords = data.lpaRecords || {}
    data.lpaRecords[entry.reference] = {
      commitment: entry,
      planningReference: data.planningReference,
      planningStage: ADDED_STAGE,
      officer,
      status: ADDED_STATUS,
      history: [{ event: 'added', by: officer, at: nowStamp() }]
    }
    data.recordReference = entry.reference
    data.lpaFlash = 'added'
    // "Add a developer record" starts afresh
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

// Which review options a record offers: the first step's (options with no
// `step`) until its commitment details are reviewed, then the planning
// application stages (`step: planning`)
function stepOf(record) {
  return record && record.status.value === REVIEWED_STATUS ? PLANNING_STEP : ''
}

function optionsFor(page, record) {
  const step = stepOf(record)
  return page.content.options.filter((option) => (option.step || '') === step)
}

// The record page: a flash message says a record was just added. The
// review options open with none chosen and post back here; Submit returns
// to the dashboard, which says the record was updated. Reviewing the
// details later keeps the record For review and notes it on the timeline;
// reviewing them moves it on to its planning application's stage, and
// choosing the stage it is at already changes nothing. Rejecting needs a
// comment and is final: a rejected record shows a warning in place of the
// radios, and a post for it changes nothing.
const viewRecord = {
  load(ctx) {
    const redirect = loadRecord(ctx)
    if (redirect) {
      return redirect
    }
    const { data } = ctx
    // The kit keeps the last post's fields in the session
    delete data[COMMENT_FIELD]
    delete data[ctx.page.field]
    if (!ctx.preview) {
      delete data.newStatus
    }
  },
  get(ctx, model) {
    const { data, page } = ctx
    model.flash = data.lpaFlash === 'added' ? 'added' : null
    delete data.lpaFlash
    // The items line up with the page's options
    const offered = new Set(optionsFor(page, data.record))
    model.content.items = model.content.items.filter((item, index) =>
      offered.has(page.content.options[index])
    )
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
    data.commitment = data.record.commitment
    if (data.record.status.value === REJECTED_STATUS) {
      return { ok: true, value: null }
    }
    const choice = String(body[page.field] || '')
    const comment = String(body[COMMENT_FIELD] || '').trim()
    data.newStatus = choice
    const step = stepOf(data.record)
    const allowed = optionsFor(page, data.record).map((option) =>
      String(option.value)
    )
    if (!allowed.includes(choice)) {
      const key = step === PLANNING_STEP ? 'stageRequired' : 'required'
      return {
        ok: false,
        errors: [{ field: page.field, message: message(page, key) }]
      }
    }
    if (choice === REJECTED_STATUS && !comment) {
      return {
        ok: false,
        errors: [{ field: COMMENT_FIELD, message: message(page, 'comment') }]
      }
    }
    return {
      ok: true,
      value: {
        step,
        choice,
        comment: choice === REJECTED_STATUS ? comment : ''
      }
    }
  },
  process(ctx, value) {
    const { data } = ctx
    const reference = data.recordReference
    const found = allEntries(data).find(
      (item) => item.entry.reference === reference
    )
    delete data.newStatus
    delete data[COMMENT_FIELD]
    delete data[ctx.page.field]
    const dashboardPath = ctx.journey.routes.DASHBOARD
    if (!found || !value) {
      return { redirect: dashboardPath }
    }
    const record = found.record
    const officer = (data.officer && data.officer.fullName) || MOCK_OFFICER
    const changes = {}
    let event
    if (value.step === PLANNING_STEP) {
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
      if (value.comment) {
        event.comment = value.comment
      }
    }
    data.lpaRecords = data.lpaRecords || {}
    data.lpaRecords[reference] = {
      ...record,
      ...changes,
      commitment: found.entry,
      history: [
        ...(record.history || []),
        { ...event, by: officer, at: nowStamp() }
      ]
    }
    data.lpaFlash = 'updated'
    return { redirect: dashboardPath }
  }
}

// Every detail of a record's commitment, behind the record page
const certificate = {
  load: loadRecord
}

// The landing page: counts that open the table filtered to them, the
// search and the most recently updated records
const dashboard = {
  get(ctx, model) {
    const { text } = model.content
    // After Submit on a record page: "NRL-123456 has been updated"
    if (ctx.data.lpaFlash === 'updated') {
      model.flash = String(text.updated || '').replace(
        '{reference}',
        String(ctx.data.recordReference || '')
      )
      delete ctx.data.lpaFlash
    }
    const path = ctx.journey.routes.RECORDS
    const records = allRecords(ctx.data).sort(newestFirst)
    // Each card counts the records the table shows with its filters set
    const card = (label, filters, test) => ({
      count: records.filter(test).length,
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
    model.table = tableFor(records.slice(0, DASHBOARD_ROWS), text, ctx.journey)
  }
}

// The table of every record: searched, filtered, sorted by its column
// headings and paged
const recordsTable = {
  get(ctx, model) {
    const store = loadStore()
    const { text } = model.content
    const path = ctx.journey.routes.RECORDS
    const query = queryOf(ctx, store)
    const records = sortRecords(
      allRecords(ctx.data).filter(
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
  'view-record': viewRecord,
  certificate,
  dashboard,
  records: recordsTable,
  // For tests
  loadStore,
  allRecords,
  findRecord,
  findCommitmentEntry,
  commitmentOf,
  MOCK_OFFICER,
  RECORDS_PER_PAGE
}
