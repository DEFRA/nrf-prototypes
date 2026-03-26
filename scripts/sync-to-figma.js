#!/usr/bin/env node

/**
 * Syncs text content from an HTML prototype page to a Figma frame.
 *
 * Usage:
 *   FIGMA_TOKEN=<your_token> node scripts/sync-to-figma.js
 *
 * The script:
 *   1. Parses the target HTML file and extracts visible text content
 *   2. Fetches the Figma frame's node tree to find TEXT nodes
 *   3. Diffs the current Figma text against the HTML content
 *   4. Patches changed text nodes via the Figma REST API
 */

require('dotenv').config()
const axios = require('axios')
const fs = require('fs')
const path = require('path')

// ── Config ────────────────────────────────────────────────────────────────────

const FIGMA_TOKEN = process.env.FIGMA_TOKEN
const FILE_KEY = 'jWozIjlRIH7yhjvGqleEwi'
const FRAME_NODE_ID = '7:159' // /what-would-you-like-to-do

const HTML_FILE = path.join(
  __dirname,
  '../app/views/nrf-estimate-4/what-would-you-like-to-do.html'
)

if (!FIGMA_TOKEN) {
  console.error('❌  FIGMA_TOKEN environment variable is required.')
  console.error('   Set it in your .env file or prefix the command:')
  console.error('   FIGMA_TOKEN=your_token node scripts/sync-to-figma.js')
  process.exit(1)
}

const figma = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: { 'X-Figma-Token': FIGMA_TOKEN },
})

// ── HTML parser ───────────────────────────────────────────────────────────────

/**
 * Extracts visible, static text strings from the HTML template.
 * Strips Nunjucks tags and collapses whitespace.
 */
function extractTextFromHtml(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')

  // Remove Nunjucks blocks/tags ({% ... %} and {{ ... }})
  const stripped = raw
    .replace(/\{%-?[\s\S]*?-?%\}/g, '')
    .replace(/\{\{[\s\S]*?\}\}/g, '')

  // Pull out content between HTML tags
  const matches = [...stripped.matchAll(/>([^<]+)</g)]
    .map(m => m[1].trim())
    .filter(t => t.length > 0)

  // Deduplicate while preserving order
  return [...new Set(matches)]
}

// ── Figma helpers ─────────────────────────────────────────────────────────────

/** Recursively walk a Figma node tree and collect all TEXT nodes. */
function collectTextNodes(node, results = []) {
  if (node.type === 'TEXT') {
    results.push({ id: node.id, name: node.name, characters: node.characters })
  }
  for (const child of node.children || []) {
    collectTextNodes(child, results)
  }
  return results
}

/** Fetch the full node tree for a given node ID. */
async function getFigmaNode(nodeId) {
  const encodedId = nodeId.replace(':', '-')
  const res = await figma.get(`/files/${FILE_KEY}/nodes`, {
    params: { ids: encodedId, geometry: 'paths' },
  })
  const key = Object.keys(res.data.nodes)[0]
  return res.data.nodes[key]?.document
}

/** Patch a single TEXT node's characters via the Figma API. */
async function patchTextNode(nodeId, newText) {
  await figma.put(`/files/${FILE_KEY}/nodes`, {
    nodes: {
      [nodeId]: {
        document: {
          characters: newText,
        },
      },
    },
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📄  Parsing HTML file…')
  const htmlTexts = extractTextFromHtml(HTML_FILE)
  console.log(`   Found ${htmlTexts.length} text strings:\n`)
  htmlTexts.forEach(t => console.log(`   • "${t}"`))

  console.log('\n🔍  Fetching Figma frame…')
  let frameNode
  try {
    frameNode = await getFigmaNode(FRAME_NODE_ID)
  } catch (err) {
    const status = err.response?.status
    const msg = err.response?.data?.err || err.message
    if (status === 403) {
      console.error('\n❌  Access denied (403). Check your FIGMA_TOKEN has edit access to this file.')
    } else {
      console.error(`\n❌  Failed to fetch Figma node (${status}): ${msg}`)
    }
    process.exit(1)
  }

  const textNodes = collectTextNodes(frameNode)
  console.log(`\n   Found ${textNodes.length} TEXT nodes in Figma frame:\n`)
  textNodes.forEach(n => console.log(`   [${n.id}] "${n.characters}"`))

  // Diff: find Figma text nodes whose content differs from the closest HTML match
  console.log('\n🔄  Diffing content…\n')
  const updates = []

  for (const node of textNodes) {
    const figmaText = node.characters?.trim()

    // Normalise a string for fuzzy matching: lowercase and strip trailing punctuation
    const normalise = s => s?.toLowerCase().replace(/[?!.,]+$/, '').trim()
    const normFigma = normalise(figmaText)

    // Find the closest matching string in the HTML. First try exact/containment,
    // then fall back to normalised containment (catches e.g. "do?" vs "do Jon?")
    const htmlMatch = htmlTexts.find(t =>
      t === figmaText ||
      t.includes(figmaText) ||
      figmaText?.includes(t) ||
      normalise(t) === normFigma ||
      normalise(t)?.includes(normFigma) ||
      normFigma?.includes(normalise(t))
    )

    if (htmlMatch && htmlMatch !== figmaText) {
      console.log(`   CHANGE [${node.id}]`)
      console.log(`     Figma: "${figmaText}"`)
      console.log(`     HTML:  "${htmlMatch}"`)
      updates.push({ id: node.id, newText: htmlMatch })
    } else if (!htmlMatch) {
      console.log(`   SKIP   [${node.id}] "${figmaText}" — no HTML match found`)
    } else {
      console.log(`   OK     [${node.id}] "${figmaText}"`)
    }
  }

  if (updates.length === 0) {
    console.log('\n✅  Figma is already in sync with the HTML. Nothing to update.')
    return
  }

  console.log(`\n📝  Applying ${updates.length} update(s) to Figma…\n`)
  for (const { id, newText } of updates) {
    try {
      await patchTextNode(id, newText)
      console.log(`   ✅  Updated [${id}] → "${newText}"`)
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.err || err.message
      if (status === 403 || status === 404) {
        console.error(`   ⚠️   [${id}] could not be updated (${status}): ${msg}`)
        console.error(`       Note: The Figma REST API requires edit access and the node`)
        console.error(`       must not be inside a locked component. Use a Figma Plugin`)
        console.error(`       for full write access to component instances.`)
      } else {
        console.error(`   ❌  [${id}] error (${status}): ${msg}`)
      }
    }
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error('Unexpected error:', err.message)
  process.exit(1)
})
