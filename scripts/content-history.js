#!/usr/bin/env node
/**
 * Writes app/data/content-history.json: for every page marked
 * `handoff: <date>` in a journey.yaml, whether its copy has changed since,
 * answered from git. The deployed prototype has no .git folder, so the
 * Publish workflow runs this before the image is built and the app reads
 * the file instead (app/lib/journey-engine/history.js).
 *
 *   npm run handoff:manifest
 */

const fs = require('fs')
const path = require('path')
const {
  loadJourney,
  getJourneyIds
} = require('../app/lib/journey-engine/loader')
const {
  collectHistory,
  MANIFEST_FILE
} = require('../app/lib/journey-engine/history')

const journeys = []
for (const id of getJourneyIds()) {
  try {
    journeys.push(loadJourney(id))
  } catch (error) {
    console.warn(`⚠ ${id}: not included (${error.message.split('\n')[0]})`)
  }
}

const manifest = collectHistory(journeys)
fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true })
fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`)

const entries = Object.entries(manifest.pages)
console.log(
  `Wrote ${path.relative(process.cwd(), MANIFEST_FILE)} (${entries.length} handed-over page${entries.length === 1 ? '' : 's'})`
)
for (const [key, page] of entries) {
  const state = page.changed
    ? `changed since${page.uncommitted ? ' (uncommitted)' : ''}`
    : 'ready for dev'
  console.log(`  ${key}  ${page.on}  ${state}`)
}
