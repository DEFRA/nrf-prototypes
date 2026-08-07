#!/usr/bin/env node
// Extract a Figma prototype's screens + click-flow via the Figma REST API.
// Writes .tmp/figma-journey/<fileKey>/{page.json,flow.json,flow.md}.
// No npm deps (Node 22 global fetch). Never prints the FIGMA_TOKEN.

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SETUP_DOC, fail, parseArgs, parseLocation, figmaGet, collectScreens } from './figma-lib.mjs'

const HASH_LEN = 12
// A screen whose Dev Mode annotation matches this is rendered full-width (1280px
// container) — see the "Wide screens" note in SKILL.md.
const WIDE_ANNOTATION = /\bwide\b/i

function walk(node, visit) {
  visit(node)
  for (const child of node.children || []) {
    walk(child, visit)
  }
}

function addDest(seen, node, toId, navigation) {
  if (!toId) {
    return
  }
  const key = `${node.id}|${toId}`
  if (!seen.has(key)) {
    seen.set(key, { fromId: node.id, fromName: node.name, toId, navigation })
  }
}

// NOTE: field names are the Figma *REST* API shape (GET /files/:key/nodes):
// each node exposes `interactions[]`, and each interaction has `trigger` +
// a plural `actions[]` of `{ type, destinationId, navigation }`. This is NOT
// the Figma *Plugin* API, which uses `node.reactions[]` with a singular
// `action`. We deliberately use REST (no Figma MCP), so `interactions`/`actions`
// is correct — do not "fix" this to `reactions`/`action` (verified against the
// live response: 1030 `interactions`, 0 `reactions`). `transitionNodeID` is the
// legacy single-link fallback for older prototype nodes.
function nodeDestinations(node) {
  const dests = []
  for (const interaction of node.interactions || []) {
    for (const action of interaction.actions || []) {
      if (action.destinationId) {
        dests.push(action.destinationId)
      }
    }
  }
  if (node.transitionNodeID) {
    dests.push(node.transitionNodeID)
  }
  return dests
}

function collectTransitions(screens) {
  const seen = new Map()
  for (const screen of screens) {
    walk(screen, (node) => {
      for (const interaction of node.interactions || []) {
        for (const action of interaction.actions || []) {
          addDest(seen, node, action.destinationId, action.navigation || 'NAVIGATE')
        }
      }
      addDest(seen, node, node.transitionNodeID, 'transition')
    })
  }
  return [...seen.values()]
}

// A stable per-frame fingerprint used to detect designer changes on re-run (see
// the "Updating an existing journey" section of SKILL.md). It hashes the frame's
// meaningful content — node type, name, visible TEXT characters, and prototype
// destinations — in document order, and deliberately ignores absolute canvas
// coordinates so that merely moving a frame around the page is not a change.
function frameFingerprint(frame) {
  const parts = []
  walk(frame, (node) => {
    const entry = { t: node.type, n: node.name }
    if (typeof node.characters === 'string') {
      entry.c = node.characters
    }
    const dests = nodeDestinations(node)
    if (dests.length > 0) {
      entry.d = dests
    }
    parts.push(entry)
  })
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, HASH_LEN)
}

// Dev Mode annotations the REST API exposes on a node as `annotations[]`, each
// with a `label` / `labelMarkdown`. Designers use them to flag layout intent
// (e.g. "WIDE" on a screen root). Collected across the whole frame subtree so an
// annotation placed on the root frame or a child is picked up either way.
function nodeAnnotationLabels(node) {
  const labels = []
  for (const annotation of node.annotations || []) {
    const text = annotation.label || annotation.labelMarkdown
    if (text) {
      labels.push(text.trim())
    }
  }
  return labels
}

function frameAnnotations(frame) {
  const labels = []
  walk(frame, (node) => {
    labels.push(...nodeAnnotationLabels(node))
  })
  return labels
}

function buildIdIndex(screens) {
  const idToScreen = new Map()
  for (const screen of screens) {
    walk(screen, (node) => idToScreen.set(node.id, screen.name))
  }
  return idToScreen
}

function classify(transitions, idToScreen) {
  const onPage = []
  const offPage = []
  for (const transition of transitions) {
    const toName = idToScreen.get(transition.toId)
    if (toName) {
      onPage.push({ ...transition, toName })
    } else {
      offPage.push(transition)
    }
  }
  return { onPage, offPage }
}

function renderFlowMd({ fileKey, nodeId, startNodeId, screens, transitions }) {
  const lines = [
    `# Figma prototype flow — ${fileKey}`,
    '',
    `- Requested node: \`${nodeId}\``,
    `- Flow starting point: \`${startNodeId || 'n/a'}\``,
    `- Screens: ${screens.length}`,
    '',
    '## Screens',
    '',
    '| # | id | name | size | layout | annotations |',
    '| - | -- | ---- | ---- | ------ | ----------- |'
  ]
  screens.forEach((screen, index) => {
    const layout = screen.wide ? '**WIDE** (1280px)' : 'default'
    const notes = (screen.annotations || []).join('; ') || '—'
    lines.push(`| ${index + 1} | \`${screen.id}\` | ${screen.name} | ${screen.width}×${screen.height} | ${layout} | ${notes} |`)
  })
  lines.push('', '## On-page flow', '')
  if (transitions.onPage.length === 0) {
    lines.push('_No on-page transitions found._')
  }
  for (const transition of transitions.onPage) {
    lines.push(`- "${transition.fromName}" (\`${transition.fromId}\`) → ${transition.toName} (\`${transition.toId}\`)`)
  }
  lines.push('', '## Off-page / library links (ignore)', '')
  if (transitions.offPage.length === 0) {
    lines.push('_None._')
  }
  for (const transition of transitions.offPage) {
    lines.push(`- "${transition.fromName}" (\`${transition.fromId}\`) → \`${transition.toId}\``)
  }
  lines.push('')
  return lines.join('\n')
}

async function resolveNodeId(fileKey, nodeId, token) {
  if (nodeId) {
    return nodeId
  }
  const file = await figmaGet(`/files/${fileKey}?depth=1`, token)
  const firstPage = (file.document.children || [])[0]
  if (!firstPage) {
    fail(`No pages found in file ${fileKey}`)
  }
  console.log(`No node given — using first page ${firstPage.id}`)
  return firstPage.id
}

async function main() {
  const token = process.env.FIGMA_TOKEN
  if (!token) {
    fail(`FIGMA_TOKEN is not set. See ${SETUP_DOC}`)
  }
  const { location, nodeFlag } = parseArgs(process.argv.slice(2))
  if (!location) {
    fail('Usage: figma-extract.mjs <figma-url | KEY#node | KEY --node A-B>')
  }
  const parsed = parseLocation(location, nodeFlag)
  if (!parsed.fileKey) {
    fail(`Could not parse a fileKey from: ${location}`)
  }
  const fileKey = parsed.fileKey
  const nodeId = await resolveNodeId(fileKey, parsed.nodeId, token)

  const data = await figmaGet(`/files/${fileKey}/nodes?ids=${nodeId}`, token)
  const entry = data.nodes[nodeId]
  if (!entry) {
    fail(`Node ${nodeId} not found in file ${fileKey}`)
  }
  const document = entry.document
  const screens = collectScreens(document)
  const startNodeId = document.flowStartingPoints?.[0]?.nodeId || null
  const transitions = classify(collectTransitions(screens), buildIdIndex(screens))
  const screenMeta = screens.map((screen) => {
    const annotations = frameAnnotations(screen)
    return {
      id: screen.id,
      name: screen.name,
      width: Math.round(screen.absoluteBoundingBox?.width || 0),
      height: Math.round(screen.absoluteBoundingBox?.height || 0),
      annotations,
      wide: annotations.some((label) => WIDE_ANNOTATION.test(label)),
      hash: frameFingerprint(screen)
    }
  })
  const flow = { fileKey, nodeId, startNodeId, screens: screenMeta, transitions }

  const outDir = join('.tmp', 'figma-journey', fileKey)
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'page.json'), JSON.stringify(data, null, 2))
  await writeFile(join(outDir, 'flow.json'), JSON.stringify(flow, null, 2))
  await writeFile(join(outDir, 'flow.md'), renderFlowMd(flow))

  console.log(`Wrote ${join(outDir, 'page.json')}`)
  console.log(
    `Wrote ${join(outDir, 'flow.json')} — ${screenMeta.length} screens, ` +
      `${transitions.onPage.length} on-page / ${transitions.offPage.length} off-page transitions`
  )
  console.log(`Wrote ${join(outDir, 'flow.md')}`)
  console.log(`Next: read ${join(outDir, 'flow.md')}, then run figma-images.mjs to render the screens`)
}

main()
