#!/usr/bin/env node
// Post-build fidelity audit. For every view the skill built for a Figma location,
// check that the screen's verbatim content strings (from text.json, excluding
// screen-chrome) actually appear in the rendered page. Catches "missing text" /
// "wrong screen" errors a 200/branch smoke test cannot. Fetches the live page
// from the running dev server when reachable, otherwise extracts string literals
// from the view file. Reads journeys.json (frame -> view) + text.json.
// No npm deps; optional network (the dev server).

import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { fail, parseLocation, SKILL_DIR } from './figma-lib.mjs'

const MANIFEST = join(SKILL_DIR, 'journeys.json')
const DEFAULT_PORT = 3000

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    return fail(`Could not read ${label} (${path}): ${err.message}`)
  }
}

async function readManifest(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') {
      return fail(
        `No manifest at ${path} — record the journey first (Step 6.6).`
      )
    }
    return fail(`Could not read manifest (${path}): ${err.message}`)
  }
}

// Normalise both sides the same way: decode entities, fold dashes/quotes, collapse
// whitespace, and drop the space that tag-stripping leaves before punctuation
// (e.g. "word </a>." -> "word ." -> "word."). Case is folded for matching only.
function normalize(s) {
  return (s || '')
    .replace(/&#163;/g, '£')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

function contains(haystack, needle) {
  if (!needle) {
    return true
  }
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  if (h.includes(n)) {
    return true
  }
  // Over-concatenation guard: a single Figma text node can bundle a paragraph
  // with adjacent text (e.g. a declaration + "Levy amount £00000"). If every
  // clause is present in the rendered page, treat the needle as present.
  if (n.length > 80) {
    const parts = n.split(/(?<=\.)\s+/).filter((p) => p.length >= 4)
    if (parts.length >= 2 && parts.every((p) => h.includes(p))) {
      return true
    }
  }
  return false
}

// Visible text of the live rendered page, or null if the server is not reachable.
async function liveText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) {
      return null
    }
    let html = await res.text()
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
    return normalize(html.replace(/<[^>]+>/g, '\n'))
  } catch {
    return null
  }
}

// Fallback when there is no server: pull string literals (macro args, hrefs, raw
// attribute text) plus raw visible text out of the unrendered view file.
async function fileText(path) {
  if (!(await exists(path))) {
    return null
  }
  let raw = await readFile(path, 'utf8')
  raw = raw.replace(/\{#[\s\S]*?#\}/g, ' ')
  const literals = []
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g
  let m
  while ((m = re.exec(raw))) {
    literals.push(m[1] ?? m[2] ?? '')
  }
  const stripped = raw
    .replace(/\{%[\s\S]*?%\}/g, ' ')
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/<[^>]+>/g, ' ')
  return normalize(`${literals.join('\n')}\n${stripped}`)
}

function slug(view) {
  return view.replace(/\.html?$/, '').replace(/\.njk$/, '')
}

function printView(label, view, missing, source) {
  if (missing.length === 0) {
    console.log(`  ✓ ${view} (${source}) — all content strings present`)
    return
  }
  console.log(`  ✗ ${view} (${source}) — ${missing.length} missing:`)
  for (const s of missing) {
    console.log(`      • ${s}`)
  }
}

async function auditJourney(journey, text, port) {
  const journeyKey = journey.journey
  const frameToView = new Map((journey.frames || []).map((f) => [f.id, f.view]))
  const textById = new Map((text.frames || []).map((f) => [f.id, f]))
  const views = [...new Set([...frameToView.values()].filter(Boolean))]
  let pass = 0
  for (const view of views) {
    const frameIds = (journey.frames || [])
      .filter((f) => f.view === view)
      .map((f) => f.id)
    const content = new Set()
    for (const id of frameIds) {
      const f = textById.get(id)
      if (!f) {
        continue
      }
      for (const s of f.strings) {
        if (!s.chrome && s.text.trim().length >= 2) {
          content.add(normalize(s.text))
        }
      }
    }
    const url = `http://localhost:${port}/${journeyKey}/${slug(view)}`
    let rendered = await liveText(url)
    let source = 'live'
    if (rendered === null) {
      rendered = await fileText(join(journey.viewsDir, view))
      source = rendered === null ? 'missing' : 'file'
    }
    if (source === 'missing') {
      console.log(
        `  ! ${view} — could not read (no server and no file ${join(journey.viewsDir, view)})`
      )
      continue
    }
    const missing = [...content].filter((c) => !contains(rendered, c))
    printView(`${journeyKey}/${view}`, view, missing, source)
    if (missing.length === 0) {
      pass += 1
    }
  }
  return { total: views.length, pass }
}

async function main() {
  const location = process.argv[2]
  if (!location) {
    fail('Usage: figma-fidelity.mjs <figma-url | KEY#node | fileKey>')
  }
  const { fileKey, nodeId } = parseLocation(location)
  if (!fileKey) {
    fail(`Could not parse a fileKey from: ${location}`)
  }
  const text = await readJson(
    join('.tmp', 'figma-journey', fileKey, 'text.json'),
    'text.json (run figma-text.mjs first)'
  )
  const manifest = await readManifest(MANIFEST)
  const port = Number(process.env.PORT || DEFAULT_PORT)

  let journeys = (manifest.journeys || []).filter((j) => j.fileKey === fileKey)
  if (nodeId) {
    const exact = journeys.filter((j) => j.node === nodeId)
    if (exact.length > 0) {
      journeys = exact
    }
  }
  if (journeys.length === 0) {
    fail(
      `No manifest journey for ${fileKey} — record the journey first (Step 6.6).`
    )
  }

  for (const journey of journeys) {
    console.log(`\nJourney "${journey.journey}" (${journey.viewsDir}):`)
    const { total, pass } = await auditJourney(journey, text, port)
    console.log(`  ${pass}/${total} views passed`)
  }
  console.log(
    '\nReview any ✗ lines: each is screen content present in Figma but missing from'
  )
  console.log(
    'the built view. (If a string was invisible on the screen, drop it from the'
  )
  console.log('inventory rather than adding it — confirm against the PNG.)')
}

main()
