#!/usr/bin/env node
// Build a per-frame, verbatim, reading-ordered text inventory from the extracted
// page.json, plus content analysis the skill uses to avoid transcription errors:
//   - which strings are repeated screen-chrome (header/footer) vs real content
//   - the candidate header service-name per frame (-> detect multiple services)
//   - duplicate frames (identical content hash) and "exploration board" (no links)
// Writes text.json + text.md next to flow.json. Run AFTER figma-extract.mjs.
// No npm deps, no network, never reads the token.

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fail, parseLocation, collectScreens } from './figma-lib.mjs'

// Header tokens that are NOT the service name.
const HEADER_TOKENS = new Set([
  'GOV',
  'GOV.UK',
  'Menu',
  'Search',
  'Search on GOV.UK',
  'Show search',
  'Hide search',
  'Skip to main content'
])
// Generic Figma / component-placeholder labels (not real screen copy).
const PLACEHOLDER_EXACT = new Set([
  'Label',
  'Hint text',
  'Hint',
  'Error message',
  'Error',
  'Body text',
  'Caption',
  'Caption text',
  'Label caption text',
  'Input',
  'Button',
  'Title',
  'Heading',
  'Text',
  'Placeholder',
  'Description',
  'Help text',
  'Required',
  'Optional',
  'Select',
  'Option',
  'Example'
])
const PLACEHOLDER_REGEX = [
  /^Navigation item \d+/i,
  /^Nav item/i,
  /^List item \d+/i,
  /^Tab heading/i,
  /^Row \d+/i,
  /^Column [A-Z]/i,
  /^Section \d+/i,
  /^lorem/i
]

function normalize(s) {
  return (s || '').replace(/\s+/g, ' ').trim()
}

function short(s, n = 70) {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function isPlaceholder(text) {
  return (
    PLACEHOLDER_EXACT.has(text) || PLACEHOLDER_REGEX.some((r) => r.test(text))
  )
}

// Visible, non-placeholder TEXT nodes that sit inside `frame`'s box, with their
// position relative to the frame so the caller can sort them into reading order.
// Prunes hidden / opacity-0 subtrees and drops off-canvas/overflow nodes. This
// removes a lot of the "in the node tree but not on the rendered screen" noise,
// but NOT all of it (occluded layers read as visible to the API) — the skill
// still reconciles this inventory against the PNG/vision before transcribing.
function collectText(frame) {
  const fb = frame.absoluteBoundingBox
  const out = []
  function walkNode(node, parentHidden) {
    const hidden = parentHidden || node.visible === false || node.opacity === 0
    if (hidden) {
      return
    }
    if (node.type === 'TEXT') {
      const raw = normalize(node.characters)
      if (raw && !isPlaceholder(raw)) {
        const b = node.absoluteBoundingBox
        if (!b || !fb) {
          out.push({ text: raw, x: 0, y: 0, size: node.style?.fontSize || 0 })
        } else {
          const inside =
            b.x >= fb.x - 2 &&
            b.y >= fb.y - 2 &&
            b.x + b.width <= fb.x + fb.width + 2 &&
            b.y + b.height <= fb.y + fb.height + 2
          if (inside) {
            out.push({
              text: raw,
              x: b.x - fb.x,
              y: b.y - fb.y,
              size: node.style?.fontSize || 0
            })
          }
        }
      }
    }
    for (const child of node.children || []) {
      walkNode(child, hidden)
    }
  }
  walkNode(frame, false)
  // Reading order: top-to-bottom; on the same line (within 6px) left-to-right.
  out.sort((a, b) => (Math.abs(a.y - b.y) <= 6 ? a.x - b.x : a.y - b.y))
  return out
}

// The header-band text that is probably the service name — the first content-row
// text in the top of the frame (the service name sits just under the GOV.UK mark,
// above the phase banner), excluding the crown/menu tokens and the "." separator.
// Returns '' for bare GOV.UK headers. Used to detect screens from different services.
function candidateService(text) {
  const hits = text.filter(
    (t) =>
      t.y < 110 &&
      t.x >= 150 &&
      t.text.length >= 3 &&
      !HEADER_TOKENS.has(t.text)
  )
  if (hits.length === 0) {
    return ''
  }
  hits.sort((a, b) => a.y - b.y || a.x - b.x)
  return hits[0].text
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (err) {
    return fail(`Could not read ${label} (${path}): ${err.message}`)
  }
}

function firstDocument(pageJson) {
  const first = Object.values(pageJson.nodes || {})[0]
  return first ? first.document : null
}

function renderTextMd(report) {
  const lines = [
    `# Figma text inventory — ${report.fileKey}`,
    '',
    `- Frames: ${report.frames.length}`,
    `- Exploration board (no on-page links): ${report.explorationBoard ? 'YES — confirm the intended flow with the user or build a screen index' : 'no'}`,
    `- Distinct services detected: ${report.services.length}` +
      (report.services.length > 1
        ? '  ⚠ MORE THAN ONE — ask the user whether to split into separate journeys or mark outliers reference-only'
        : ''),
    '',
    '## Services',
    ''
  ]
  for (const svc of report.services) {
    lines.push(
      `- "${short(svc.name) || '(bare/none)'}" — ${svc.frames.length} frame(s): ${svc.frames.map((f) => f.id).join(', ')}`
    )
  }
  lines.push(
    '',
    '## Duplicate frames (identical content → map to one view)',
    ''
  )
  if (report.duplicates.length === 0) {
    lines.push('_None._')
  } else {
    for (const dup of report.duplicates) {
      lines.push(
        `- hash \`${dup.hash}\` — ${dup.frames.map((f) => `${f.name} (\`${f.id}\`)`).join(' = ')}`
      )
    }
  }
  lines.push('', '## Per-frame content (verbatim, in reading order)', '')
  report.frames.forEach((frame, i) => {
    lines.push(
      `### ${i + 1}. ${frame.name} (\`${frame.id}\`)` +
        (frame.service ? ` — service: "${short(frame.service)}"` : '')
    )
    const content = frame.strings.filter((s) => !s.chrome)
    if (content.length === 0) {
      lines.push('_No screen-specific content strings (chrome only)._')
    } else {
      content.forEach((s, idx) => lines.push(`${idx + 1}. ${s.text}`))
    }
    const chromeCount = frame.strings.length - content.length
    lines.push(
      `_(${chromeCount} chrome/header/footer string${chromeCount === 1 ? '' : 's'} hidden)_`,
      ''
    )
  })
  return lines.join('\n')
}

async function main() {
  const location = process.argv[2]
  if (!location) {
    fail('Usage: figma-text.mjs <figma-url | KEY#node | fileKey>')
  }
  const { fileKey } = parseLocation(location)
  if (!fileKey) {
    fail(`Could not parse a fileKey from: ${location}`)
  }
  const outDir = join('.tmp', 'figma-journey', fileKey)
  const page = await readJson(
    join(outDir, 'page.json'),
    'page.json (run figma-extract.mjs first)'
  )
  const flow = await readJson(
    join(outDir, 'flow.json'),
    'flow.json (run figma-extract.mjs first)'
  )
  const document = firstDocument(page)
  if (!document) {
    fail('page.json has no document node')
  }
  const frames = collectScreens(document)
  const hashById = new Map((flow.screens || []).map((s) => [s.id, s.hash]))
  const onPageLinks = (
    flow.transitions && flow.transitions.onPage ? flow.transitions.onPage : []
  ).length

  const perFrame = frames.map((frame) => {
    const strings = collectText(frame)
    return { id: frame.id, name: frame.name, strings }
  })

  // Screen-chrome = strings repeated on most frames (header/footer/phase banner).
  const total = perFrame.length
  const threshold = total >= 4 ? Math.round(0.6 * total) : total + 1
  const frameCount = new Map()
  for (const f of perFrame) {
    for (const s of new Set(f.strings.map((x) => x.text))) {
      frameCount.set(s, (frameCount.get(s) || 0) + 1)
    }
  }
  const chromeTexts = new Set(
    [...frameCount.entries()].filter(([, n]) => n >= threshold).map(([s]) => s)
  )
  for (const f of perFrame) {
    for (const s of f.strings) {
      s.chrome = chromeTexts.has(s.text)
    }
    f.service = candidateService(f.strings)
  }

  // Service clusters + duplicate groups. Duplicates are detected by CONTENT
  // signature (the ordered, non-chrome strings), not by the frame hash — two
  // frames can render to identical screens yet carry different node hashes.
  const services = new Map()
  for (const f of perFrame) {
    const key = f.service || ''
    if (!services.has(key)) {
      services.set(key, [])
    }
    services.get(key).push({ id: f.id, name: f.name })
  }
  const bySig = new Map()
  for (const f of perFrame) {
    const sig = JSON.stringify(
      f.strings.filter((s) => !s.chrome).map((s) => s.text)
    )
    if (!bySig.has(sig)) {
      bySig.set(sig, [])
    }
    bySig.get(sig).push({ id: f.id, name: f.name, hash: hashById.get(f.id) })
  }

  const report = {
    fileKey,
    nodeId: flow.nodeId,
    explorationBoard: onPageLinks === 0,
    chromeThreshold: threshold,
    services: [...services.entries()].map(([name, frames]) => ({
      name,
      frames
    })),
    duplicates: [...bySig.values()]
      .filter((g) => g.length > 1)
      .map((g) => ({ hash: g[0].hash, frames: g })),
    frames: perFrame.map((f) => ({
      id: f.id,
      name: f.name,
      service: f.service,
      strings: f.strings
    }))
  }

  await writeFile(join(outDir, 'text.json'), JSON.stringify(report, null, 2))
  await writeFile(join(outDir, 'text.md'), renderTextMd(report))
  console.log(`Wrote ${join(outDir, 'text.json')}`)
  console.log(
    `Wrote ${join(outDir, 'text.md')} — ${perFrame.length} frames, ${report.services.length} service(s), ${report.duplicates.length} duplicate group(s)`
  )
  console.log(
    `Next: read text.md — transcribe each frame's numbered content list verbatim, in order`
  )
}

main()
