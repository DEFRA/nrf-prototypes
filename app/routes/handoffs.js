//
// Frozen copies of design handoffs: /handoffs/<journey>/latest/<page> shows
// each page from its own most recent handoff; /handoffs/<journey>/<date>/<page>
// pins the whole journey to one handoff's commit.
//
// Serves the journey from the snapshot (see app/lib/journey-engine/snapshots.js)
// with the same dispatcher as the live journey, so Back, Continue and Change
// links all stay inside the copy.
//

const fs = require('fs')
const path = require('path')
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const {
  dispatch,
  getJourneyIds,
  isHandoffDate,
  loadFrozenJourney,
  HANDOFFS_MOUNT,
  LATEST
} = require('../lib/journey-engine')

// The same lookup as app/routes.js (not imported from there: it requires
// this file)
function hooksFor(id) {
  const file = path.join(__dirname, '../lib', id, 'hooks.js')
  return fs.existsSync(file) ? require(file) : {}
}

router.use(`${HANDOFFS_MOUNT}/:journeyId/:date`, (req, res, next) => {
  const { journeyId, date } = req.params
  if (
    (date !== LATEST && !isHandoffDate(date)) ||
    !getJourneyIds().includes(journeyId)
  ) {
    return next()
  }
  // The page the visit starts on decides which handoff commit is shown
  const pageId = req.path.split('/').filter(Boolean)[0] || null
  const result = loadFrozenJourney(journeyId, date, pageId)
  if (result.error) {
    return res.status(result.status).render('handoffs/not-found', {
      journeyId,
      date,
      message: result.error,
      toolsPath: `/tools/journeys/${journeyId}`
    })
  }
  const { journey } = result
  if (!pageId) {
    return res.redirect(`${journey.basePath}/${journey.start}`)
  }
  return dispatch(
    journey,
    journey.basePath,
    hooksFor(journeyId),
    req,
    res,
    next
  )
})

module.exports = router
