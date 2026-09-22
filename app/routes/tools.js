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
  journeySections,
  exportSections,
  toMermaid,
  toFlowJson,
  isQuestionType,
  previewVariants,
  copyVariants,
  previewErrorStates,
  captureScreens,
  captureScreen,
  canExportScreens,
  VIEWPORTS,
  pageHandoff,
  journeyHandoffs
} = require('../lib/journey-engine')

// Where the prototype is published, for the "copy link" buttons on the wall
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL ||
  'https://nrf-prototypes.ext-test.cdp.defra.gov.uk'
).replace(/\/$/, '')

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
    variants: previewVariants(page),
    // Alternative copy for the same page (pages/<id>~<variant>.md), each a
    // card of its own beside the page and compared at compareUrl
    copies: copyVariants(page),
    compareUrl: copyVariants(page).length
      ? `/tools/journeys/${journey.id}/compare/${page.id}`
      : null,
    // Every error the page can show, for the card's Show menu
    errorStates: previewErrorStates(page),
    shared: page.shared,
    contentFile: page.contentFile,
    // `handoff: <date>` in journey.yaml: ready for dev, or changed since
    handoff: pageHandoff(journey, page)
  }
}

// A branch that leaves the journey for an absolute path: no screen here,
// just a card saying where it goes. Inside a group's section the same card
// stands for a page of the journey outside the group.
function externalView(entry) {
  return {
    via: entry.via || '',
    id: entry.id,
    path: entry.path,
    heading: entry.heading,
    external: true
  }
}

// A group folded into one card on the main wall, pointing at its section
function groupView(page, via) {
  return {
    via: via || '',
    id: page.id,
    path: page.path,
    title: page.groupTitle,
    count: page.groupCount,
    group: true
  }
}

function levelViews(levels, journey) {
  return levels.map((row) => ({
    unreachable: Boolean(row.unreachable),
    pages: row.pages.map((entry) => {
      if (entry.external) {
        return externalView(entry)
      }
      const page = journey.byId.get(entry.id)
      return page.type === 'group'
        ? groupView(page, entry.via)
        : pageView(page, journey.source || journey, entry.via)
    })
  }))
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
  // The main journey with each group (sign in, account creation) folded
  // into one card and one node, then a section per group
  const sections = journeySections(journey)
  // `source` is the real journey, for the handoff lookup (git blames its
  // journey.yaml); `byId` is the collapsed view of its pages
  const collapsed = { byId: new Map(), source: journey }
  for (const row of sections.main.levels) {
    for (const entry of row.pages) {
      if (!entry.external && !collapsed.byId.has(entry.id)) {
        collapsed.byId.set(entry.id, journey.byId.get(entry.id))
      }
    }
  }
  for (const page of sections.main.graph.nodes) {
    if (page.kind === 'group') {
      collapsed.byId.set(page.id, {
        id: page.id,
        path: page.path,
        type: 'group',
        groupTitle: sections.groups.find((g) => `group:${g.id}` === page.id)
          .title,
        groupCount: sections.groups.find((g) => `group:${g.id}` === page.id)
          .count
      })
    }
  }
  const levels = levelViews(sections.main.levels, collapsed)
  const groups = sections.groups.map((group) => ({
    id: group.id,
    title: group.title,
    anchor: group.anchor.slice(1),
    count: group.count,
    levels: levelViews(group.levels, journey)
  }))
  const graphs = {
    main: sections.main.graph,
    groups: sections.groups.map((group) => ({
      id: group.id,
      anchor: group.anchor.slice(1),
      graph: group.graph
    }))
  }
  res.render('tools/journey', {
    exportSections: exportSections(journey),
    journey: {
      id: journey.id,
      name: journey.name,
      basePath: journey.basePath,
      start: journey.start,
      pageCount: journey.pages.length
    },
    publicBaseUrl: PUBLIC_BASE_URL,
    // Playwright is a dev dependency, so the export is local-only
    canExportScreens: canExportScreens(),
    // Pages handed to development, newest first
    handoffs: journeyHandoffs(journey),
    levels,
    groups,
    edges: getEdges(journey),
    // Inlined in a <script> tag, so keep "</" out of the JSON
    graphJson: JSON.stringify(graphs).replace(/</g, '\\u003c')
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
// ?viewport=mobile captures at phone width (see VIEWPORTS in screenshots.js)
// ?errors=1 also captures each form's error state; leave it off for a
// quicker export with fewer files to drag onto a whiteboard.
// ?section=main&section=one-login picks which parts to export (the main
// journey and each group); everything when left out
// ?screens=handoff exports only the pages handed to development, each from
// its frozen copy (see snapshots.js), instead of every page live
router.get('/tools/journeys/:journey/screens.zip', async (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  const viewport = VIEWPORTS[req.query.viewport]
    ? req.query.viewport
    : 'desktop'
  const includeErrors = req.query.errors === '1'
  const available = exportSections(journey).map((section) => section.id)
  const chosen = []
    .concat(req.query.section === undefined ? available : req.query.section)
    .filter((id) => available.includes(id))
  if (!chosen.length) {
    res
      .status(400)
      .type('text/plain')
      .send('Tick at least one section to export')
    return
  }
  const handoff = req.query.screens === 'handoff'
  const partial = chosen.length < available.length
  const folder = [
    journey.id,
    handoff ? 'handoff' : '',
    viewport === 'desktop' ? '' : viewport,
    partial ? chosen.join('+') : ''
  ]
    .filter(Boolean)
    .join('-')
  let screens
  try {
    screens = await captureScreens(journey, {
      baseUrl: `${req.protocol}://${req.get('host')}`,
      viewport,
      includeErrors,
      sections: chosen,
      handoff
    })
  } catch (error) {
    res.status(500).type('text/plain').send(error.message)
    return
  }
  if (!screens.length) {
    res
      .status(404)
      .type('text/plain')
      .send('No page of this journey has a frozen copy to export yet')
    return
  }
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${folder}-screens.zip"`
  )
  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.on('error', (error) => {
    res.destroy(error)
  })
  archive.pipe(res)
  for (const { file, buffer } of screens) {
    archive.append(buffer, { name: `${folder}/${file}` })
  }
  archive.finalize()
})

// One page's copies side by side: its own copy and each copy variant
// (pages/<id>~<variant>.md), at desktop or mobile width, in the error
// state if wanted. Opened from the "Compare side by side" link on the wall
router.get('/tools/journeys/:journey/compare/:page', (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  const page = journey.byId.get(req.params.page)
  if (!page) {
    res.status(404).type('text/plain').send('No such page to compare')
    return
  }
  const showsErrors = isQuestionType(page.type) || page.type === 'custom'
  const errorStates = showsErrors ? previewErrorStates(page) : []
  const fileOf = (contentFile) => contentFile.split('/').pop()
  res.render('tools/compare', {
    journey: { id: journey.id, name: journey.name, basePath: journey.basePath },
    page: {
      id: page.id,
      path: page.path,
      type: page.type,
      heading: page.content.heading,
      isCustom: page.type === 'custom',
      file: fileOf(page.contentFile),
      folder: page.contentFile.replace(/\/[^/]+$/, '')
    },
    // The page's own copy first, then each variant; `query` picks the copy
    // on the preview URL (`_copy`, so the session's choice is left alone)
    copies: [
      { id: null, label: 'Default', file: fileOf(page.contentFile), query: '' },
      ...copyVariants(page).map((copy) => ({
        id: copy.id,
        label: copy.label,
        file: fileOf(copy.contentFile),
        query: `&_copy=${copy.id}`
      }))
    ],
    errorQuery: errorStates.length ? errorStates[0].query : null,
    wallUrl: `/tools/journeys/${journey.id}#screen-${page.id}`,
    publicBaseUrl: PUBLIC_BASE_URL
  })
})

// One screen as a JPG, for the export button on each card of the wall.
// Always desktop width; ?error=1 captures the form's error state (or
// ?error=<key> one of its other errors, such as max),
// ?variant=<id> one of the page's preview variants, ?copy=<id> one of its
// copy variants and ?handoff=1 the frozen copy of the page as handed over
router.get('/tools/journeys/:journey/screens/:page.jpg', async (req, res) => {
  const journey = loadOr404(req, res)
  if (!journey) {
    return
  }
  let screen
  try {
    screen = await captureScreen(journey, {
      baseUrl: `${req.protocol}://${req.get('host')}`,
      viewport: 'desktop',
      pageId: req.params.page,
      error: req.query.error ? String(req.query.error) : null,
      variant: req.query.variant ? String(req.query.variant) : null,
      copy: req.query.copy ? String(req.query.copy) : null,
      handoff: req.query.handoff === '1'
    })
  } catch (error) {
    res.status(500).type('text/plain').send(error.message)
    return
  }
  if (!screen) {
    res.status(404).type('text/plain').send('No such screen to export')
    return
  }
  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${journey.id}-${screen.file}"`
  )
  res.send(screen.buffer)
})

module.exports = router
