const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const {
  groupJourneysByFamily,
  isMounted
} = require('../config/shared/journeys')

/**
 * Homepage route
 * Builds the tabs from the journey registry on every request, so edits to
 * app/config/shared/journeys.yaml or a content journey's `homepage:` block
 * show up on refresh without a restart.
 */
router.get('/', function (req, res) {
  const families = groupJourneysByFamily().map((family) => ({
    ...family,
    all: family.all.map((journey) => ({
      ...journey,
      mounted: isMounted(journey.id)
    }))
  }))
  for (const family of families) {
    family.latest = family.versioned ? family.all[0] : undefined
    family.previous = family.versioned ? family.all.slice(1) : []
  }
  res.render('index', { families })
})

module.exports = router
