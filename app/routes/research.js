//
// User research aids that belong to no journey: the participant details
// box (includes/research-participant.html, opened from the footer of every
// page or by `?participant` on any URL).
//
// The facilitator types the participant's name and the organisation or
// client they are acting for, once, and the mock accounts use them in place
// of the stand-in names ("Name Name", Developer Ltd, ACME LTD…): see
// app/lib/nrf-request-to-use-1/hooks.js. The details live in the session
// as `researchParticipant`, so Clear data forgets them and Sign out does
// not. Nothing here is part of the service under test.
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const PARTICIPANT_PATH = '/research/participant'

// Form field → session key. The fields start with _ so the kit's automatic
// session storage leaves them alone and only the trimmed object is kept
const FIELDS = {
  firstName: '_first-name',
  lastName: '_last-name',
  organisation: '_organisation'
}

/**
 * The participant the facilitator described, from the box's form body:
 * null when every box was blank (or "Forget them" was pressed)
 */
function participantFrom(body) {
  const participant = {}
  for (const [key, field] of Object.entries(FIELDS)) {
    const value = String(body[field] || '').trim()
    if (value) {
      participant[key] = value
    }
  }
  if (body._forget || !Object.keys(participant).length) {
    return null
  }
  participant.fullName = [participant.firstName, participant.lastName]
    .filter(Boolean)
    .join(' ')
  return participant
}

/**
 * Where to go back to once the details are saved: the page the box was
 * opened on. Only a path within the prototype will do; anything else
 * (another site, a protocol) goes to the homepage
 */
function safeReturnPath(value) {
  const path = String(value || '')
  return /^\/(?!\/)[^\s]*$/.test(path) ? path : '/'
}

// `?participant` on any page opens the box. The kit copies every query
// parameter into the session before the routes run, so the stray key is
// removed again here rather than left to open the box on every page after
router.use((req, res, next) => {
  if (req.session && req.session.data && 'participant' in req.query) {
    delete req.session.data.participant
    if (res.locals.data) {
      delete res.locals.data.participant
    }
    res.locals.participantModal = true
  }
  next()
})

router.post(PARTICIPANT_PATH, (req, res) => {
  if (!req.session.data) {
    req.session.data = {}
  }
  const participant = participantFrom(req.body || {})
  if (participant) {
    req.session.data.researchParticipant = participant
  } else {
    delete req.session.data.researchParticipant
  }
  res.redirect(303, safeReturnPath(req.body && req.body._return))
})

module.exports = router
module.exports.participantFrom = participantFrom
module.exports.safeReturnPath = safeReturnPath
module.exports.PARTICIPANT_PATH = PARTICIPANT_PATH
