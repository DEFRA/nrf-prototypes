#!/usr/bin/env node
/**
 * Export every screen of a content-driven journey as JPGs.
 *
 * Usage:
 *   npm run screenshot:journey nrf-quote-7
 *   npm run screenshot:journey nrf-quote-7 -- --base-url http://localhost:3100
 *
 * The prototype must already be running. Files go to screenshots/<journey>/
 * and use the same capture code as the "Export all screens as JPG" button on
 * /tools/journeys/<journey>.
 */

const fs = require('fs')
const path = require('path')
const {
  loadJourney,
  getJourneyIds,
  captureScreens
} = require('../app/lib/journey-engine')

function parseArgs(argv) {
  const options = { baseUrl: 'http://localhost:3000', outDir: 'screenshots' }
  const positional = []
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base-url') {
      options.baseUrl = argv[i + 1]
      i += 1
    } else if (arg === '--out') {
      options.outDir = argv[i + 1]
      i += 1
    } else {
      positional.push(arg)
    }
  }
  options.journey = positional[0]
  return options
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!options.journey) {
    console.error(
      'Usage: npm run screenshot:journey <journey> [-- --base-url <url>] [--out <dir>]'
    )
    console.error(`Journeys: ${getJourneyIds().join(', ')}`)
    process.exit(1)
  }
  const journey = loadJourney(options.journey)
  const outDir = path.resolve(options.outDir, journey.id)
  fs.mkdirSync(outDir, { recursive: true })

  console.log(`Capturing ${journey.name} from ${options.baseUrl}`)
  const results = await captureScreens(journey, {
    baseUrl: options.baseUrl,
    onProgress: (screen, done, total) => {
      console.log(`  [${done}/${total}] ${screen.file}`)
    }
  })
  for (const { file, buffer } of results) {
    fs.writeFileSync(path.join(outDir, file), buffer)
  }
  console.log(`Saved ${results.length} files to ${outDir}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
