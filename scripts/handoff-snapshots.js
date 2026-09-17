#!/usr/bin/env node
/**
 * Extracts content/ at every handoff commit into app/data/handoffs/<commit>,
 * so the deployed prototype (no .git folder) can serve the frozen copies at
 * /handoffs/<journey>/<date>/... (app/lib/journey-engine/snapshots.js).
 *
 * Reads the commits from app/data/content-history.json, so run
 * `npm run handoff:manifest` first. Idempotent: commits already extracted
 * are left alone.
 *
 *   npm run handoff:snapshots
 */

const fs = require('fs')
const path = require('path')
const { MANIFEST_FILE } = require('../app/lib/journey-engine/history')
const {
  BAKED_ROOT,
  extractSnapshot
} = require('../app/lib/journey-engine/snapshots')

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
} catch (error) {
  console.error(
    `Cannot read ${path.relative(process.cwd(), MANIFEST_FILE)}: run npm run handoff:manifest first`
  )
  process.exit(1)
}

const commits = new Set()
for (const page of Object.values(manifest.pages || {})) {
  if (page.stampCommit) {
    commits.add(page.stampCommit)
  }
}
for (const commit of Object.values(manifest.tags || {})) {
  commits.add(commit)
}

if (commits.size === 0) {
  console.log('No handoffs to snapshot')
  process.exit(0)
}

for (const commit of commits) {
  const dir = extractSnapshot(commit, BAKED_ROOT)
  console.log(`${commit.slice(0, 7)}  ${path.relative(process.cwd(), dir)}`)
}
console.log(
  `${commits.size} snapshot${commits.size === 1 ? '' : 's'} in ${path.relative(process.cwd(), BAKED_ROOT)}`
)
