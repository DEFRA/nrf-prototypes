//
// Prototype tools: journey flow diagrams and live screen walls
//
// Everything here is generated from content/<journey>/journey.yaml, so the
// diagram and the wall can never drift from the running prototype.
//

const archiver = require('archiver')
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
  isQuestionType,
  captureScreens
} = require('../lib/journey-engine')

function pageView(page, journey, via) {
  return {
    via: via || '',
    id: page.id,
    path: page.path,
    type: page.type,
    heading: page.content.heading,
    isQuestion: isQuestionType(page.type),
    isCustom: page.type === 'custom',
    isExit: !(page.next && page.next.length),
    shared: page.shared,
    contentFile: page.contentFile
  }
}

// A branch that leaves the journey for an absolute path: no screen here,
// just a card saying where it goes
function externalView(entry) {
  return {
    via: entry.via || '',
    id: entry.id,
    path: entry.path,
    external: true
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
  const levels = layoutLevels(journey).map((row) => ({
    unreachable: Boolean(row.unreachable),
    pages: row.pages.map((entry) =>
      entry.external
        ? externalView(entry)
        : pageView(journey.byId.get(entry.id), journey, entry.via)
    )
  }))
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

// Every screen as a JPG, zipped. Drives headless Chromium over the preview
// URLs, so it takes a little while and needs Playwright installed.
router.get('/tools/journeys/:journey/screens.zip', async (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  let screens
  try {
    screens = await captureScreens(journey, {
      baseUrl: `${req.protocol}://${req.get('host')}`
    })
  } catch (error) {
    res.status(500).type('text/plain').send(error.message)
    return
  }
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${journey.id}-screens.zip"`
  )
  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.on('error', (error) => {
    res.destroy(error)
  })
  archive.pipe(res)
  for (const { file, buffer } of screens) {
    archive.append(buffer, { name: `${journey.id}/${file}` })
  }
  archive.finalize()
})

module.exports = router
