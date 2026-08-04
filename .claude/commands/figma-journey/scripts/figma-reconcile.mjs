#!/usr/bin/env node
// Reconcile a freshly-extracted Figma flow against the committed journey manifest
// (.claude/skills/figma-journey/journeys.json). Answers two questions:
//   - Is this Figma location a NEW journey, or an UPDATE to an existing one?
//   - If an update, which frames (and therefore which view files) changed?
// Run AFTER figma-extract.mjs. Reads .tmp/figma-journey/<fileKey>/flow.json.
// No npm deps, no network, never reads the token.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fail, parseLocation } from './figma-lib.mjs'

const MANIFEST = '.claude/skills/figma-journey/journeys.json'

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    return fail(`Could not read ${label} at ${path}: ${err.message}`)
  }
}

function diffFrames(recordedFrames, currentScreens) {
  const currentById = new Map(currentScreens.map((s) => [s.id, s]))
  const recordedIds = new Set(recordedFrames.map((f) => f.id))
  const report = { unchanged: [], changed: [], added: [], removed: [] }
  for (const frame of recordedFrames) {
    const current = currentById.get(frame.id)
    if (!current) {
      report.removed.push(frame)
    } else if (current.hash === frame.hash) {
      report.unchanged.push(frame)
    } else {
      report.changed.push({ ...frame, newHash: current.hash })
    }
  }
  for (const screen of currentScreens) {
    if (!recordedIds.has(screen.id)) {
      report.added.push(screen)
    }
  }
  return report
}

function uniqueViews(frames) {
  return [...new Set(frames.map((f) => f.view).filter(Boolean))]
}

function printCategory(label, frames, render) {
  if (frames.length === 0) {
    return
  }
  console.log(`\n${label}:`)
  for (const frame of frames) {
    console.log(`  ${render(frame)}`)
  }
}

function printNew(fileKey, node, siblings) {
  console.log('MODE: NEW')
  console.log(`No journey in the manifest matches ${fileKey}#${node || '(first page)'}.`)
  if (siblings.length > 0) {
    console.log(`Note: the same Figma file already backs [${siblings.join(', ')}] under a different`)
    console.log('node, so this is a separate journey — pick a new journey key.')
  }
  console.log('\nNext: full reconstruction (SKILL.md Step 5), then add a journey entry to')
  console.log(`${MANIFEST} recording each frame id → view and its hash from flow.json.`)
}

function printUpdate(journey, report) {
  const touched = report.changed.length + report.added.length + report.removed.length
  console.log('MODE: UPDATE')
  console.log(`Matches journey "${journey.journey}" (${journey.viewsDir}).`)
  console.log(
    `unchanged ${report.unchanged.length} · changed ${report.changed.length} · ` +
      `added ${report.added.length} · removed ${report.removed.length}`
  )
  printCategory('CHANGED (re-map these frames, patch their views, keep local copy)', report.changed, (f) => `${f.name} (${f.id}) → ${f.view}`)
  printCategory('ADDED (new screens — build a view + wire them in)', report.added, (s) => `${s.name} (${s.id})`)
  printCategory('REMOVED (gone from Figma — flag for the user, do NOT auto-delete)', report.removed, (f) => `${f.name} (${f.id}) → ${f.view}`)

  console.log('')
  if (touched === 0) {
    console.log('Nothing to do — the design is unchanged since it was last reconstructed.')
    return
  }
  const views = uniqueViews(report.changed)
  if (views.length > 0) {
    console.log(`Views to update: ${views.join(', ')}`)
  }
  console.log('Re-render only the changed/added frames (figma-images.mjs), re-map them to GDS,')
  console.log('and patch just those views — preserve hand-written copy and the dashboard macro.')
  console.log(`Then update the changed frames' hashes in ${MANIFEST}.`)
}

async function main() {
  const location = process.argv[2]
  if (!location) {
    fail('Usage: figma-reconcile.mjs <figma-url | KEY#node | fileKey>')
  }
  const { fileKey, nodeId } = parseLocation(location)
  if (!fileKey) {
    fail(`Could not parse a fileKey from: ${location}`)
  }

  const flowPath = join('.tmp', 'figma-journey', fileKey, 'flow.json')
  const flow = await readJson(flowPath, 'flow.json (run figma-extract.mjs first)')
  const manifest = await readJson(MANIFEST, 'journey manifest')
  const journeys = manifest.journeys || []
  const resolvedNode = nodeId || flow.nodeId

  const match = journeys.find((j) => j.fileKey === fileKey && j.node === resolvedNode)
  if (!match) {
    const siblings = journeys.filter((j) => j.fileKey === fileKey).map((j) => j.journey)
    printNew(fileKey, resolvedNode, siblings)
    return
  }
  printUpdate(match, diffFrames(match.frames || [], flow.screens || []))
}

main()
