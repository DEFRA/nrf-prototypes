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
 *   - the dashboard's counts and the records table, with search and sort
 *   - the record page's audit timeline and its Change status popover
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
// How many records the dashboard's table shows
const DASHBOARD_ROWS = 6
// The status of a record an officer has just added
const ADDED_STATUS = 'received'
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
    return { statuses: {}, boundaries: {}, commitments: [] }
  }
  if (!cached || cached.mtime !== mtime) {
    const raw = yaml.load(fs.readFileSync(RECORDS_FILE, 'utf8')) || {}
    cached = {
      mtime,
      store: {
        statuses: raw.statuses || {},
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

function statusOf(value, store) {
  const status = store.statuses[value] || {}
  return {
    value,
    label: status.label || value,
    colour: status.colour || 'grey'
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

/**
 * A record as the pages show it: its commitment, status tag, who added and
 * last reviewed it, and its audit timeline, newest first
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
    planningStatus: record.planningStatus || 'active',
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
        by: event.by,
        date: formatDate(event.date),
        time: formatTime(event.date)
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

// Rows of govukTable for the records, with the page's own column copy
function tableFor(records, text, journey) {
  const viewPath = journey.routes.VIEW_RECORD
  const columns = text.columns || {}
  return {
    head: [
      { text: columns.reference || 'NRL reference' },
      { text: columns.developer || 'Developer' },
      { text: columns.officer || 'Officer' },
      { text: columns.lastModified || 'Last modified' },
      { text: columns.expires || 'Expires' },
      { text: columns.status || 'Status' }
    ],
    rows: records.map((record) => [
      {
        html:
          `<a class="govuk-link govuk-link--no-visited-state govuk-!-font-weight-bold" ` +
          `href="${viewPath}?ref=${encodeURIComponent(record.reference)}">` +
          `${escapeHtml(record.reference)}</a>`
      },
      { text: record.developer },
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

const SORTS = {
  updated: (a, b) => (b.lastModified || 0) - (a.lastModified || 0),
  expires: (a, b) => (a.expires || 0) - (b.expires || 0),
  reference: (a, b) => a.reference.localeCompare(b.reference)
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

// ?_q= and ?_sort= (the kit never keeps a query key starting with `_` in
// the session, so a search never follows the officer around)
function searchOf(ctx) {
  const query = ctx.query || {}
  return {
    q: String(query._q || '').trim(),
    sort: SORTS[query._sort] ? String(query._sort) : 'updated'
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

// "Add record": the commitment joins the council's records, added by the
// officer now, and the record page says so
const checkYourAnswers = {
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
      planningStatus: 'active',
      officer,
      status: ADDED_STATUS,
      history: [{ event: 'added', by: officer, at: nowStamp() }]
    }
    data.recordReference = entry.reference
    data.lpaFlash = 'added'
    // "Add another record" starts afresh
    for (const key of [
      'commitmentReference',
      'commitmentEntry',
      'planningReference',
      'addRecordConfirmed'
    ]) {
      delete data[key]
    }
    return {
      redirect: `${ctx.journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(entry.reference)}`
    }
  }
}

// The Change status options and copy, for the popover on the record page,
// with the record's current status chosen
function statusDialogFor(journey, record) {
  const page = journey.byId.get('change-status')
  if (!page) {
    return null
  }
  return {
    action: page.path,
    field: page.field,
    heading: page.content.heading,
    hint: page.content.hint,
    button: page.content.button,
    items: page.content.options.map((option) => ({
      text: option.label,
      value: option.value,
      hint: option.hint ? { text: option.hint } : undefined,
      checked: Boolean(record && record.status.value === option.value)
    }))
  }
}

// The record page: ?ref=NRL-123456 picks the record (and is remembered for
// the Change status page); a flash message says what just happened
const viewRecord = {
  load(ctx) {
    const { data, query } = ctx
    const reference = String(query.ref || data.recordReference || '')
    delete data.ref
    const record = reference ? findRecord(data, reference) : null
    if (!record) {
      return ctx.preview
        ? undefined
        : { redirect: ctx.journey.routes.DASHBOARD }
    }
    data.recordReference = reference
    data.record = record
    data.commitment = record.commitment
  },
  get(ctx, model) {
    const { data } = ctx
    model.flash = data.lpaFlash
    delete data.lpaFlash
    model.statusDialog = statusDialogFor(ctx.journey, data.record)
  }
}

// Change status: the new status and an entry on the audit timeline. The
// page opens on the record's current status; choosing it again changes
// nothing, so the timeline never repeats itself
const changeStatus = {
  load(ctx) {
    const { data } = ctx
    if (!ctx.preview && data.recordReference) {
      data.record = findRecord(data, data.recordReference)
      if (data.record) {
        data.newStatus = data.record.status.value
      }
    }
  },
  process(ctx, status) {
    const { data } = ctx
    const reference = data.recordReference
    const found = allEntries(data).find(
      (item) => item.entry.reference === reference
    )
    if (!found) {
      return { redirect: ctx.journey.routes.DASHBOARD }
    }
    delete data.newStatus
    const viewPath = `${ctx.journey.routes.VIEW_RECORD}?ref=${encodeURIComponent(reference)}`
    if ((found.record.status || ADDED_STATUS) === status) {
      return { redirect: viewPath }
    }
    const officer = (data.officer && data.officer.fullName) || MOCK_OFFICER
    data.lpaRecords = data.lpaRecords || {}
    data.lpaRecords[reference] = {
      ...found.record,
      commitment: found.entry,
      status,
      history: [
        ...(found.record.history || []),
        { event: 'status', status, by: officer, at: nowStamp() }
      ]
    }
    data.lpaFlash = 'status'
    return { redirect: viewPath }
  }
}

// The landing page: counts, search and the most recently updated records
const dashboard = {
  get(ctx, model) {
    const records = allRecords(ctx.data).sort(SORTS.updated)
    model.counts = {
      active: records.filter((r) => !r.expired && r.planningStatus === 'active')
        .length,
      dispute: records.filter(
        (r) => !r.expired && r.planningStatus === 'in-dispute'
      ).length,
      expired: records.filter((r) => r.expired).length
    }
    model.table = tableFor(
      records.slice(0, DASHBOARD_ROWS),
      model.content.text,
      ctx.journey
    )
  }
}

// The table of every record, searched and sorted
const recordsTable = {
  get(ctx, model) {
    const search = searchOf(ctx)
    const records = allRecords(ctx.data)
      .filter((record) => matches(record, search.q))
      .sort(SORTS[search.sort])
    model.search = search
    model.resultCount = records.length
    model.table = tableFor(records, model.content.text, ctx.journey)
  }
}

module.exports = {
  'one-login-email': signOut,
  'one-login-password': oneLoginSignIn,
  'retrieve-commitment': retrieveCommitment,
  'check-your-answers': checkYourAnswers,
  'view-record': viewRecord,
  'change-status': changeStatus,
  dashboard,
  records: recordsTable,
  // For tests
  loadStore,
  allRecords,
  findRecord,
  findCommitmentEntry,
  commitmentOf,
  MOCK_OFFICER
}
