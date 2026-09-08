//
// Prototype tools: journey flow diagrams and live screen walls
//
// Everything here is generated from content/<journey>/journey.yaml, so the
// diagram and the wall can never drift from the running prototype.
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const {
  loadJourney,
  getJourneyIds,
  getEdges,
  layoutLevels,
  toMermaid,
  toFlowJson,
  toFlowGraph,
  isQuestionType
} = require('../lib/journey-engine')

function pageView(page, journey) {
  return {
    id: page.id,
    path: page.path,
    type: page.type,
    heading: page.content.heading,
    isQuestion: isQuestionType(page.type),
    isCustom: page.type === 'custom',
    isExit: !(page.next && page.next.length),
    contentFile: `content/${journey.id}/pages/${page.id}.md`
  }
}

function loadOr404(req, res) {
  try {
    return loadJourney(req.params.journey)
  } catch (error) {
    res.status(404).render('tools/journeys', {
      journeys: listJourneys(),
      notFound: req.params.journey,
      loadError: error.message
    })
    return null
  }
}

function listJourneys() {
  return getJourneyIds().map((id) => {
    try {
      const journey = loadJourney(id)
      return {
        id,
        name: journey.name,
        basePath: journey.basePath,
        pageCount: journey.pages.length,
        startPath: journey.byId.get(journey.start).path
      }
    } catch (error) {
      return { id, name: id, error: error.message }
    }
  })
}

router.get('/tools/journeys', (req, res) => {
  res.render('tools/journeys', { journeys: listJourneys() })
})

router.get('/tools/journeys/:journey', (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  const levels = layoutLevels(journey).map((ids) =>
    ids.map((id) => pageView(journey.byId.get(id), journey))
  )
  res.render('tools/journey', {
    journey: {
      id: journey.id,
      name: journey.name,
      basePath: journey.basePath,
      start: journey.start,
      pageCount: journey.pages.length
    },
    levels,
    edges: getEdges(journey),
    // Inlined in a <script> tag, so keep "</" out of the JSON
    graphJson: JSON.stringify(toFlowGraph(journey)).replace(/</g, '\\u003c')
  })
})

router.get('/tools/journeys/:journey/flow.json', (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  res.json(toFlowJson(journey))
})

router.get('/tools/journeys/:journey/flow.mmd', (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  res.type('text/plain').send(toMermaid(journey))
})

module.exports = router
