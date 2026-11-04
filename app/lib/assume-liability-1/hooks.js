/**
 * Hooks for the content-driven "Assume liability" journey
 * (content/assume-liability-1). The engine (app/lib/journey-engine) renders
 * the pages and follows journey.yaml; this file adds the bits that need code:
 *
 *   - a mock sign in: any GOV.UK One Login email or Government Gateway user
 *     ID signs in as the research participant (the footer's "Participant
 *     details" box), or a stand-in developer, and Sign out forgets it.
 *     Defra ID's "Who do you want to represent?" then picks the
 *     organisation the header shows (with Change organisation)
 *   - whether each jointly liable person is part of that organisation, and
 *     theirs when they are not
 *   - the developer records (content/assume-liability-1/records.yaml,
 *     re-read when it changes), each with the signed-in user's role, and
 *     the status of the one they assume liability for kept in the session
 *     (`liabilityProgress`) over the file's own
 *   - the record page opened by ?ref=NRL-123456; each record keeps its own
 *     answers, put aside while another is open (`recordAnswers`)
 *   - a secondary user named as jointly liable signs the record's
 *     assumption document (its `signatories` in records.yaml)
 *   - the jointly liable people, added one at a time (name, then email)
 *     into `liablePeople`, changed in place (?_edit=<n>) or removed
 *   - the signatures the assumption document waits for: the user's own
 *     (`youSigned`, from sign-assumption) and the jointly liable people's
 *     (`signatures`, keyed by email), and the research link that signs for
 *     everyone but the user (assumption-document?_signed=all)
 *
 * Nothing here is real: no passwords are checked or stored.
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { interpolate } = require('../journey-engine/markdown')
const { validatePage } = require('../journey-engine/validation')

const RECORDS_FILE = path.join(
  __dirname,
  '../../../content/assume-liability-1/records.yaml'
)
const REFERENCE = /^NRL-\d{6}$/i

// The stand-in developer, until the facilitator gives the participant's
// details
const MOCK_NAME = 'Trevor Barker'
const MOCK_BUSINESS = 'Fenland Homes'

// The answers that belong to one record's run through the journey, forgotten
// when another record is opened
const ANSWER_KEYS = [
  'assumeLiability',
  'howToPay',
  'jointlyLiable',
  'liablePerson',
  'liablePersonEmail',
  'liablePersonIndex',
  'liablePeople',
  'signatures',
  'signature',
  'youSigned',
  'payerDetails'
]

const SIGN_IN_KEYS = [
  'account',
  'signInEmail',
  'signInMethod',
  'chosenOrganisation'
]

let cache = { mtime: 0, store: { statuses: {}, records: [] } }

/**
 * records.yaml, re-read whenever it changes so edits show on the next page
 * load without a restart
 */
function loadStore() {
  try {
    const { mtimeMs } = fs.statSync(RECORDS_FILE)
    if (mtimeMs !== cache.mtime) {
      const parsed = yaml.load(fs.readFileSync(RECORDS_FILE, 'utf8')) || {}
      cache = {
        mtime: mtimeMs,
        store: {
          statuses: parsed.statuses || {},
          records: parsed.records || []
        }
      }
    }
  } catch (error) {
    console.error('assume-liability-1: cannot read records.yaml', error)
  }
  return cache.store
}

// `month: 'short'` writes it as 2 Nov 2026
function formatDate(value, month = 'long') {
  if (!value) {
    return ''
  }
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month,
    year: 'numeric'
  }).format(date)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * The research participant, as the facilitator described them in the
 * footer's "Participant details" box: blank strings when nothing was given
 */
function participantOf(data) {
  const given = (data && data.researchParticipant) || {}
  const firstName = String(given.firstName || '').trim()
  const lastName = String(given.lastName || '').trim()
  return {
    fullName: [firstName, lastName].filter(Boolean).join(' '),
    organisation: String(given.organisation || '').trim()
  }
}

/**
 * The signed-in account. `organisationName` is the organisation chosen on
 * Defra ID's "Who do you want to represent?" (the participant's own until
 * then), shown in the header; `organisationPage` is where its Change
 * organisation link goes (app/views/journey-engine/_signed-in-bar.html)
 */
function accountFor(email, data) {
  const participant = participantOf(data)
  const organisation = participant.organisation || MOCK_BUSINESS
  return {
    fullName: participant.fullName || MOCK_NAME,
    businessName: organisation,
    organisationName: organisation,
    organisationPage: 'choose-organisation',
    email: email || ''
  }
}

/**
 * The answers given for a record: the session's own for the record on
 * screen, the ones put aside when another record was opened for the rest
 * (see switchRecord)
 */
function answersFor(reference, data) {
  if (reference === data.recordReference) {
    return data
  }
  return (data.recordAnswers || {})[reference] || {}
}

/**
 * Everyone who signs a record's assumption document, each with the date
 * they signed (`signedOn`, and `signedShort` as 2 Nov 2026) or '' while
 * the document waits for them. On the primary
 * user's record that is the signed-in user (signed on sign-assumption,
 * `youSigned`) then each jointly liable person they named (signed once
 * `signatures` holds their email). On a secondary user's record it is the
 * record's `signatories` from records.yaml, with the signed-in user where
 * it says `you: true`; `signatures` can sign the others too (the research
 * link on the assumption document).
 */
function signatoriesFor(raw, answers, account) {
  const signatures = answers.signatures || {}
  const you = {
    fullName: account.fullName,
    organisation: account.businessName,
    email: account.email,
    you: true,
    signedOn: formatDate(answers.youSigned),
    signedShort: formatDate(answers.youSigned, 'short')
  }
  const other = (person) => ({
    fullName: person.fullName,
    organisation: person.organisation || account.businessName,
    email: person.email,
    signedOn: formatDate(person.signed || signatures[person.email]),
    signedShort: formatDate(person.signed || signatures[person.email], 'short')
  })
  if (raw.role !== 'primary') {
    return (raw.signatories || []).map((person) =>
      person.you ? you : other(person)
    )
  }
  const people = Array.isArray(answers.liablePeople) ? answers.liablePeople : []
  return [you, ...people.map(other)]
}

/**
 * A status from records.yaml as a tag shows it: its `one` label while
 * the document waits for a single signature, when it has one
 */
function statusFor(store, value, signatories) {
  const status = store.statuses[value] || {}
  const waiting = signatories.filter((person) => !person.signedOn).length
  return {
    value,
    label: (waiting === 1 && status.one) || status.label || value,
    colour: status.colour || 'grey'
  }
}

/**
 * A record from records.yaml as the pages show it: who signs, its status
 * (moved on by the journey: the primary user's record as they assume
 * liability, a secondary user's once they have signed), dates written
 * out, the boundary in the shape `:::map` draws and the signed-in user's
 * organisation as the developer of their own records
 */
function recordFor(raw, store, data) {
  const progress = (data.liabilityProgress || {})[raw.reference] || {}
  const account = data.account || accountFor('', data)
  const primary = raw.role === 'primary'
  const answers = answersFor(raw.reference, data)
  const signatories = signatoriesFor(raw, answers, account)
  const allSigned = signatories.every((person) => person.signedOn)
  let statusValue = progress.status || raw.status
  // A secondary user asked to sign: once they have, the document waits for
  // the others, then it is signed by everyone
  if (!primary && raw.status === 'sign' && answers.youSigned) {
    statusValue = allSigned ? 'signed' : 'signatures'
  }
  // The primary user's document, once everyone has signed it
  if (primary && statusValue === 'signatures' && allSigned) {
    statusValue = 'signed'
  }
  return {
    ...raw,
    primary,
    signatories,
    developer: raw.developer || (primary ? account.businessName : ''),
    primaryUser: primary ? account.fullName : raw.primaryUser,
    status: statusFor(store, statusValue, signatories),
    // Only the primary user of a record whose planning permission is
    // granted is asked to assume liability
    canAssume: primary && statusValue === 'ready',
    permissionGranted: formatDate(raw.permissionGranted),
    liabilityAssumed: formatDate(progress.assumedOn || raw.liabilityAssumed),
    lastUpdated: formatDate(
      answers.youSigned || progress.updatedOn || raw.lastUpdated
    ),
    boundary: { coordinates: raw.boundary || [] }
  }
}

/**
 * The records, the record on screen and who signs it, worked out afresh on
 * every page (a preview's sample answers included). `sharedLiability`: the
 * record has more than one person liable (the signing page says so).
 */
function refresh(data) {
  const store = loadStore()
  data.records = store.records.map((raw) => recordFor(raw, store, data))
  data.record =
    data.records.find((record) => record.reference === data.recordReference) ||
    null
  data.signatories = data.record ? data.record.signatories : []
  data.sharedLiability = data.signatories.length > 1
}

/**
 * Open another record: the answers given for the one on screen are put
 * aside (`recordAnswers`, keyed by NRL reference) and the new record's own
 * come back, so moving between records loses nothing
 */
function switchRecord(data, reference) {
  const stash = (data.recordAnswers = data.recordAnswers || {})
  const current = {}
  for (const key of ANSWER_KEYS) {
    if (data[key] !== undefined) {
      current[key] = data[key]
    }
    delete data[key]
  }
  if (data.recordReference) {
    stash[data.recordReference] = current
  }
  Object.assign(data, stash[reference] || {})
  delete stash[reference]
  data.recordReference = reference
}

function setProgress(data, status) {
  const reference = data.recordReference
  if (!reference) {
    return
  }
  data.liabilityProgress = data.liabilityProgress || {}
  const progress = { status, updatedOn: today() }
  if (status === 'liable') {
    progress.assumedOn = today()
  }
  data.liabilityProgress[reference] = progress
}

function forgetLiablePerson(data) {
  delete data.liablePerson
  delete data.liablePersonEmail
  delete data.liablePersonIndex
}

function context(ctx) {
  refresh(ctx.data)
}

// Sign out forgets the account and returns to "How do you want to sign in?"
const signInMethod = {
  routes(router, journey) {
    const routes = { SIGN_OUT: `${journey.basePath}/sign-out` }
    router.get(routes.SIGN_OUT, (req, res) => {
      const data = (req.session && req.session.data) || {}
      for (const key of SIGN_IN_KEYS) {
        delete data[key]
      }
      res.redirect(`${journey.basePath}/sign-in-method`)
    })
    return routes
  }
}

const oneLoginSignIn = {
  process(ctx) {
    // The password field is named _password so the kit never stores it;
    // make sure of that here too
    delete ctx.data._password
    ctx.data.account = accountFor(ctx.data.signInEmail, ctx.data)
  }
}

const governmentGatewaySignIn = {
  process(ctx) {
    ctx.data.account = accountFor('', ctx.data)
  }
}

// Defra ID's "Who do you want to represent?": the organisation chosen goes
// into the header and is the developer on the user's own records. The
// labels are the page's copy; the first names the research participant's
// organisation (or the stand-in), so filling it in gives the name the page
// showed.
const chooseOrganisation = {
  process(ctx, value) {
    const { data, page } = ctx
    const chosen = (page.content.options || []).find(
      (option) => String(option.value) === String(value)
    )
    if (chosen && data.account) {
      const name = interpolate(chosen.label, data, { escape: false }).trim()
      data.account.organisationName = name
      data.account.businessName = name
    }
  }
}

// developer-record?ref=NRL-123456 opens that record, with the answers given
// for it before
const developerRecord = {
  load(ctx) {
    const { data, query, preview } = ctx
    if (preview) {
      return
    }
    const ref = String(query.ref || '')
      .trim()
      .toUpperCase()
    delete data.ref
    if (REFERENCE.test(ref) && ref !== data.recordReference) {
      switchRecord(data, ref)
      refresh(data)
    }
    if (!data.record) {
      return { redirect: ctx.journey.routes.MANAGE_LEVY }
    }
  },
  // Only the primary user of a granted record has the question to answer
  process(ctx) {
    if (!ctx.data.record || !ctx.data.record.canAssume) {
      return { redirect: ctx.page.path }
    }
  }
}

// No forgets anyone added; Yes with nobody added yet starts a fresh person
const anyoneElse = {
  process(ctx) {
    const { data } = ctx
    if (data.jointlyLiable !== 'yes') {
      delete data.liablePeople
      delete data.signatures
      // Nobody else to send it to: the document waits for the user alone
      setProgress(data, 'signatures')
    }
    forgetLiablePerson(data)
  }
}

// ?_new=1 (Add another person) starts a fresh person; ?_edit=<n> (a Change
// link on the list) fills the pages with that person's details
const liablePersonName = {
  load(ctx) {
    const { data, query, preview } = ctx
    if (preview) {
      return
    }
    if (query._new !== undefined) {
      forgetLiablePerson(data)
    }
    const index = Number.parseInt(query._edit, 10)
    const person = (data.liablePeople || [])[index]
    if (person) {
      data.liablePersonIndex = index
      data.liablePerson = {
        fullName: person.fullName,
        sameOrganisation: person.organisation ? 'no' : 'yes',
        organisation: person.organisation
      }
      data.liablePersonEmail = person.email
    }
  },
  // The organisation's name is required once No is chosen, and forgotten
  // when Yes is. The messages may name the user's organisation.
  validate(ctx) {
    const { page, body, data } = ctx
    const result = validatePage(page, body)
    const errors = result.ok ? [] : [...result.errors]
    const orgField = page.content.fields.find(
      (field) => field.name === 'organisation'
    )
    if (
      body['same-organisation'] === 'no' &&
      !String(body.organisation || '').trim()
    ) {
      errors.push({
        field: orgField.name,
        message: (orgField.errors || {}).required
      })
    }
    if (errors.length) {
      const named = errors.map((item) => ({
        ...item,
        message: interpolate(item.message, data, { escape: false })
      }))
      return { ok: false, errors: named, error: named[0].message, values: body }
    }
    const value = { ...result.value }
    if (value.sameOrganisation !== 'no') {
      delete value.organisation
    }
    return { ok: true, value }
  },
  // The same for the error state on the screen wall (?preview=1&error=1)
  get(ctx, model) {
    if (model.errors && model.errors.length) {
      model.errors = model.errors.map((item) => ({
        ...item,
        message: interpolate(item.message, ctx.data, { escape: false })
      }))
      model.error = model.errors[0].message
    }
  }
}

// Adds the person to the list, or updates the one being changed. An email
// already on the list is refused (`errors.duplicate` in the page's copy).
const liablePersonEmail = {
  process(ctx) {
    const { data, page } = ctx
    const people = Array.isArray(data.liablePeople)
      ? [...data.liablePeople]
      : []
    const index = Number.isInteger(data.liablePersonIndex)
      ? data.liablePersonIndex
      : -1
    const email = String(data.liablePersonEmail || '').trim()
    const taken = people.some(
      (person, i) =>
        i !== index && person.email.toLowerCase() === email.toLowerCase()
    )
    if (taken) {
      return { error: page.content.errors.duplicate }
    }
    const person = {
      fullName: data.liablePerson.fullName,
      organisation:
        data.liablePerson.sameOrganisation === 'no'
          ? data.liablePerson.organisation || ''
          : '',
      email
    }
    if (people[index]) {
      if (data.signatures && people[index].email !== email) {
        delete data.signatures[people[index].email]
      }
      people[index] = person
    } else {
      people.push(person)
    }
    data.liablePeople = people
    forgetLiablePerson(data)
  }
}

// The list's Remove links (liable-people-check/remove?_index=<n>); removing
// the last person returns to "Is there anyone else...?"
const liablePeopleCheck = {
  routes(router, journey) {
    const routes = {
      REMOVE_LIABLE_PERSON: `${journey.basePath}/liable-people-check/remove`
    }
    router.get(routes.REMOVE_LIABLE_PERSON, (req, res) => {
      const data = (req.session && req.session.data) || {}
      const people = Array.isArray(data.liablePeople) ? data.liablePeople : []
      const index = Number.parseInt(req.query._index, 10)
      if (people[index]) {
        if (data.signatures) {
          delete data.signatures[people[index].email]
        }
        people.splice(index, 1)
      }
      if (!people.length) {
        delete data.liablePeople
        return res.redirect(`${journey.basePath}/anyone-else`)
      }
      res.redirect(`${journey.basePath}/liable-people-check`)
    })
    return routes
  },
  // Save and continue sends the assumption document to everyone listed
  process(ctx) {
    ctx.data.signatures = ctx.data.signatures || {}
    setProgress(ctx.data, 'signatures')
  }
}

// The research link that signs for everyone else on the document
// (?_signed=all; the user signs for themselves on sign-assumption, from
// the Sign link on their row) and each Remind link (?_remind=<n>, a mock:
// the page says a reminder went to them). Continue only once everyone has
// signed.
const assumptionDocument = {
  load(ctx) {
    const { data, query, preview, page } = ctx
    if (preview) {
      return
    }
    const reminded = data.signatories[Number.parseInt(query._remind, 10)]
    if (reminded && !reminded.you) {
      data.reminderSent = reminded.fullName
      return { redirect: page.path }
    }
    if (query._signed !== 'all') {
      return
    }
    data.signatures = data.signatures || {}
    for (const person of data.signatories) {
      if (!person.you && person.email) {
        data.signatures[person.email] = data.signatures[person.email] || today()
      }
    }
    return { redirect: page.path }
  },
  get(ctx, model) {
    const { data } = ctx
    model.primary = Boolean(data.record && data.record.primary)
    const waiting = data.signatories.filter((person) => !person.signedOn)
    model.waitingCount = waiting.length
    model.allSigned = waiting.length === 0
    // The tags come from records.yaml, like the record's own: the
    // document's, and each person's while it waits for them
    const store = loadStore()
    model.documentStatus = statusFor(
      store,
      model.allSigned ? 'signed' : 'signatures',
      data.signatories
    )
    model.personWaiting = statusFor(store, 'signatures', [{}])
    // Shown once, after a Remind link
    model.reminderSent = data.reminderSent
    delete data.reminderSent
  },
  // Only the primary user goes on to the payment details
  process(ctx) {
    const { record, signatories } = ctx.data
    if (
      !record ||
      !record.primary ||
      signatories.some((person) => !person.signedOn)
    ) {
      return { redirect: ctx.page.path }
    }
  }
}

// Agreeing signs the assumption document for the user
const signAssumption = {
  process(ctx) {
    ctx.data.youSigned = today()
  }
}

// Confirm and submit: the record's liability is assumed
const reviewLiability = {
  process(ctx) {
    setProgress(ctx.data, 'liable')
  }
}

module.exports = {
  context,
  'sign-in-method': signInMethod,
  'one-login-password': oneLoginSignIn,
  'government-gateway-sign-in': governmentGatewaySignIn,
  'choose-organisation': chooseOrganisation,
  'developer-record': developerRecord,
  'anyone-else': anyoneElse,
  'liable-person-name': liablePersonName,
  'liable-person-email': liablePersonEmail,
  'liable-people-check': liablePeopleCheck,
  'assumption-document': assumptionDocument,
  'sign-assumption': signAssumption,
  'review-liability': reviewLiability
}
