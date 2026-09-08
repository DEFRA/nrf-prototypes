/**
 * Journey engine: flow graph helpers
 *
 * Everything here reads only journey.yaml (via the loaded definition), so the
 * same graph drives the tools page, the flow.json export and the Mermaid
 * diagram.
 */

const { describeCondition } = require('./expressions')
const { isQuestionType } = require('./loader')

function isPageTarget(target, journey) {
  return Boolean(target) && !target.startsWith('/') && journey.byId.has(target)
}

// An absolute path leaves this journey (usually for another journey's page)
function isExternalTarget(target) {
  return Boolean(target) && target.startsWith('/')
}

const EXTERNAL_HEADING = 'Continues in another journey'

/**
 * Edges: { fromId, toId, label, kind, external } where kind is
 * 'next' (form submission), 'change' (summary change link) or 'link'
 * (an action button/link on the page). External edges point at an absolute
 * path instead of a page id, so `toId` is the path itself.
 */
function getEdges(journey) {
  const edges = []
  const seen = new Set()
  const add = (edge) => {
    const key = `${edge.fromId}|${edge.toId}|${edge.kind}|${edge.label}`
    if (!seen.has(key)) {
      seen.add(key)
      edges.push(edge)
    }
  }
  for (const page of journey.pages) {
    // Default rule first so the main chain is discovered before branches
    const rules = [...(page.next || [])]
    const defaultRule = rules.find((r) => !r.when)
    const ordered = defaultRule
      ? [defaultRule, ...rules.filter((r) => r !== defaultRule)]
      : rules
    for (const rule of ordered) {
      if (isPageTarget(rule.goto, journey)) {
        const isReturn =
          Boolean(rule.when) &&
          JSON.stringify(rule.when).includes('$navFromSummary')
        add({
          fromId: page.id,
          toId: rule.goto,
          label: rule.when ? describeCondition(rule.when) : '',
          kind: isReturn ? 'return' : 'next'
        })
      } else if (isExternalTarget(rule.goto)) {
        add({
          fromId: page.id,
          toId: rule.goto,
          label: rule.when ? describeCondition(rule.when) : '',
          kind: 'next',
          external: true
        })
      }
    }
    for (const row of page.content.rows || []) {
      const targets =
        typeof row.change === 'string'
          ? [row.change]
          : (row.change || []).map((r) => r.goto)
      for (const target of targets) {
        if (isPageTarget(target, journey)) {
          add({
            fromId: page.id,
            toId: target,
            label: `Change ${row.key}`,
            kind: 'change'
          })
        }
      }
    }
    for (const action of page.content.actions || []) {
      if (isPageTarget(action.goto, journey)) {
        add({
          fromId: page.id,
          toId: action.goto,
          label: action.text,
          kind: 'link'
        })
      } else if (isExternalTarget(action.goto)) {
        add({
          fromId: page.id,
          toId: action.goto,
          label: action.text,
          kind: 'link',
          external: true
        })
      }
    }
    // Links inside the markdown body to other pages in this journey
    const linkPattern = new RegExp(
      `\\]\\(${journey.basePath}/([a-z0-9-]+)\\)`,
      'g'
    )
    let match
    while ((match = linkPattern.exec(page.content.body || '')) !== null) {
      if (isPageTarget(match[1], journey)) {
        add({ fromId: page.id, toId: match[1], label: 'link', kind: 'link' })
      }
    }
  }
  return edges
}

/**
 * One node per distinct absolute path the journey exits to, so the diagram
 * can show where a branch goes instead of dropping it.
 */
function externalNodes(journey) {
  const seen = new Set()
  const nodes = []
  for (const edge of getEdges(journey)) {
    if (edge.external && !seen.has(edge.toId)) {
      seen.add(edge.toId)
      nodes.push({
        id: edge.toId,
        heading: EXTERNAL_HEADING,
        path: edge.toId,
        kind: 'external',
        external: true,
        onMainChain: false
      })
    }
  }
  return nodes
}

/**
 * Rows for the screen wall: one row per main-chain page, in chain order.
 * Each row lists the main-chain page first, then every page that branches
 * off it (followed through any further off-chain pages), each with a
 * human-readable `via` caption explaining how it is reached. Pages only
 * reached by change links or in-page links join the row of the page that
 * links to them. Anything still unplaced goes in a final "not reached" row.
 * Exits to another journey sit in the row of the page that leaves, flagged
 * `external` (they have no screen of their own here).
 *
 * Returns [{ pages: [{ id, via, external?, path? }], unreachable }].
 */
function layoutLevels(journey) {
  const chain = mainChain(journey)
  const onChain = new Set(chain)
  const allEdges = getEdges(journey)
  const edges = allEdges.filter((edge) => !edge.external)
  const outgoing = new Map()
  for (const edge of edges) {
    if (!outgoing.has(edge.fromId)) {
      outgoing.set(edge.fromId, [])
    }
    outgoing.get(edge.fromId).push(edge)
  }
  const rows = chain.map((id) => ({ pages: [{ id, via: '' }] }))
  const rowOf = new Map(chain.map((id, index) => [id, index]))
  const place = (id, rowIndex, via) => {
    rowOf.set(id, rowIndex)
    rows[rowIndex].pages.push({ id, via })
  }
  // Pass 1: form-submission branches off each main-chain page, followed
  // depth-first through pages that are not on the chain themselves
  chain.forEach((chainId, rowIndex) => {
    const walk = (fromId, depth) => {
      for (const edge of (outgoing.get(fromId) || []).filter(
        (e) => e.kind === 'next'
      )) {
        if (onChain.has(edge.toId) || rowOf.has(edge.toId)) {
          continue
        }
        const via =
          depth === 0
            ? `If ${edge.label}`
            : `From ${fromId}${edge.label ? `, if ${edge.label}` : ''}`
        place(edge.toId, rowIndex, via)
        walk(edge.toId, depth + 1)
      }
    }
    walk(chainId, 0)
  })
  // Pass 2: pages only reached by change links or in-page links join the
  // row of whichever placed page links to them
  let placed = true
  while (placed) {
    placed = false
    for (const edge of edges) {
      if (rowOf.has(edge.fromId) && !rowOf.has(edge.toId)) {
        const detail =
          edge.label && edge.label !== 'link' ? ` (${edge.label})` : ''
        place(edge.toId, rowOf.get(edge.fromId), `From ${edge.fromId}${detail}`)
        placed = true
      }
    }
  }
  const unreachable = journey.pages
    .map((p) => p.id)
    .filter((id) => !rowOf.has(id))
    .map((id) => ({ id, via: '' }))
  if (unreachable.length) {
    rows.push({ pages: unreachable, unreachable: true })
  }
  // Pass 3: exits to other journeys join the row of the page that leaves
  for (const edge of allEdges.filter((e) => e.external)) {
    const rowIndex = rowOf.get(edge.fromId)
    if (rowIndex === undefined) {
      continue
    }
    const detail = edge.label ? `, if ${edge.label}` : ''
    rows[rowIndex].pages.push({
      id: edge.toId,
      path: edge.toId,
      via: `From ${edge.fromId}${detail}`,
      external: true
    })
  }
  return rows
}

function mermaidLabel(text) {
  return String(text).replace(/"/g, '#quot;').replace(/\n/g, '<br/>')
}

// Edge labels are trimmed so long option lists do not stretch the diagram;
// the full condition is still in flow.json
function edgeLabel(text) {
  const max = 40
  const flat = String(text).replace(/\s+/g, ' ')
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

function shortHeading(page) {
  const heading = page.content.heading || page.id
  return heading.length > 48 ? `${heading.slice(0, 45)}...` : heading
}

/**
 * Mermaid flowchart source. Nodes are clickable and open the page in
 * preview mode.
 */
function toMermaid(journey, options = {}) {
  const suffix =
    options.querySuffix !== undefined ? options.querySuffix : '?preview=1'
  const lines = ['flowchart LR']
  for (const page of journey.pages) {
    const label = mermaidLabel(`${page.id}\n${shortHeading(page)}`)
    lines.push(`  ${page.id}["${label}"]`)
  }
  // Paths are not valid Mermaid ids, so exits get ext0, ext1, ...
  const externals = externalNodes(journey)
  const externalId = new Map(externals.map((node, i) => [node.id, `ext${i}`]))
  for (const node of externals) {
    const label = mermaidLabel(`${node.path}\n${EXTERNAL_HEADING}`)
    lines.push(`  ${externalId.get(node.id)}["${label}"]`)
  }
  for (const edge of getEdges(journey)) {
    const arrow = edge.kind === 'next' ? '-->' : '-.->'
    const text = edge.kind === 'return' ? `return: ${edge.label}` : edge.label
    const label = text ? `|"${mermaidLabel(edgeLabel(text))}"|` : ''
    const toId = edge.external ? externalId.get(edge.toId) : edge.toId
    lines.push(`  ${edge.fromId} ${arrow}${label} ${toId}`)
  }
  for (const page of journey.pages) {
    lines.push(`  click ${page.id} "${page.path}${suffix}" _blank`)
  }
  for (const node of externals) {
    lines.push(
      `  click ${externalId.get(node.id)} "${node.path}${suffix}" _blank`
    )
  }
  const exits = journey.pages
    .filter((p) => !(p.next && p.next.length))
    .map((p) => p.id)
  const mains = journey.pages
    .filter((p) => p.next && p.next.length && p.id !== journey.start)
    .map((p) => p.id)
  lines.push('  classDef exit fill:#f3f2f1,stroke:#505a5f,color:#0b0c0c')
  lines.push('  classDef start fill:#00703c,stroke:#00703c,color:#ffffff')
  lines.push('  classDef main fill:#d2e2f1,stroke:#1d70b8,color:#0b0c0c')
  lines.push(
    '  classDef external fill:#ffffff,stroke:#505a5f,stroke-dasharray:4 4,color:#0b0c0c'
  )
  if (exits.length) {
    lines.push(`  class ${exits.join(',')} exit`)
  }
  if (mains.length) {
    lines.push(`  class ${mains.join(',')} main`)
  }
  if (externals.length) {
    lines.push(`  class ${[...externalId.values()].join(',')} external`)
  }
  lines.push(`  class ${journey.start} start`)
  return lines.join('\n')
}

/**
 * The default path through the journey: from the start page, follow each
 * page's default next rule (the one without a `when`) until a page has no
 * default target. This is what the flow diagram keeps on a single row.
 */
function mainChain(journey) {
  const chain = []
  const seen = new Set()
  let id = journey.start
  while (id && journey.byId.has(id) && !seen.has(id)) {
    chain.push(id)
    seen.add(id)
    const page = journey.byId.get(id)
    const defaultRule = (page.next || []).find((r) => !r.when)
    id =
      defaultRule && isPageTarget(defaultRule.goto, journey)
        ? defaultRule.goto
        : null
  }
  return chain
}

/**
 * Plain graph data for the client-side ELK renderer on the tools page.
 * Main-chain nodes and edges come first so ELK's model order keeps the
 * default path on one row; sizes are measured in the browser.
 */
function toFlowGraph(journey) {
  const chain = mainChain(journey)
  const position = new Map(chain.map((id, index) => [id, index]))
  const nodeOf = (page) => {
    const isExit = !(page.next && page.next.length)
    let kind = 'main'
    if (page.id === journey.start) {
      kind = 'start'
    } else if (page.type === 'confirmation') {
      kind = 'confirmation'
    } else if (isExit) {
      kind = 'exit'
    }
    return {
      id: page.id,
      heading: shortHeading(page),
      path: page.path,
      kind,
      onMainChain: position.has(page.id)
    }
  }
  const nodes = [
    ...chain.map((id) => nodeOf(journey.byId.get(id))),
    ...journey.pages.filter((p) => !position.has(p.id)).map(nodeOf),
    ...externalNodes(journey)
  ]
  const edges = getEdges(journey).map((edge, index) => {
    const text = edge.kind === 'return' ? `return: ${edge.label}` : edge.label
    const onMainChain =
      edge.kind === 'next' &&
      position.has(edge.fromId) &&
      position.get(edge.toId) === position.get(edge.fromId) + 1
    return {
      id: `e${index}`,
      fromId: edge.fromId,
      toId: edge.toId,
      label: text ? edgeLabel(text) : '',
      kind: edge.kind,
      dashed: edge.kind !== 'next',
      external: Boolean(edge.external),
      onMainChain
    }
  })
  edges.sort((a, b) => Number(b.onMainChain) - Number(a.onMainChain))
  return { mainChain: chain, nodes, edges }
}

/**
 * Same shape as the figma-journey skill's flow.json so its reconcile and
 * fidelity scripts can consume a markdown-sourced journey.
 */
function toFlowJson(journey) {
  const nameOf = (id) => {
    const page = journey.byId.get(id)
    return page ? page.content.heading : id
  }
  const edges = getEdges(journey)
  return {
    journey: journey.id,
    basePath: journey.basePath,
    startNodeId: journey.start,
    screens: journey.pages.map((page) => ({
      id: page.id,
      name: page.content.heading,
      path: page.path,
      type: page.type,
      template: page.template
    })),
    transitions: {
      onPage: edges
        .filter((edge) => !edge.external)
        .map((edge) => ({
          fromId: edge.fromId,
          fromName: nameOf(edge.fromId),
          toId: edge.toId,
          toName: nameOf(edge.toId),
          label: edge.label,
          kind: edge.kind
        })),
      // Branches that leave this journey for an absolute path
      offPage: edges
        .filter((edge) => edge.external)
        .map((edge) => ({
          fromId: edge.fromId,
          fromName: nameOf(edge.fromId),
          toPath: edge.toId,
          label: edge.label,
          kind: edge.kind
        }))
    }
  }
}

/**
 * Every screen to capture for a JPG export, in screen-wall order (each
 * main-chain page followed by its branches, unreached pages last). Question
 * and custom pages get a second entry showing their error state.
 *
 * Returns [{ id, type, path, url, file, error }].
 */
function exportScreens(journey) {
  const screens = []
  let index = 0
  for (const row of layoutLevels(journey)) {
    for (const { id, external } of row.pages) {
      if (external) {
        continue
      }
      const page = journey.byId.get(id)
      index += 1
      const prefix = String(index).padStart(2, '0')
      screens.push({
        id,
        type: page.type,
        path: page.path,
        url: `${page.path}?preview=1`,
        file: `${prefix}-${id}.jpg`,
        error: false
      })
      if (isQuestionType(page.type) || page.type === 'custom') {
        screens.push({
          id,
          type: page.type,
          path: page.path,
          url: `${page.path}?preview=1&error=1`,
          file: `${prefix}-${id}--error.jpg`,
          error: true
        })
      }
    }
  }
  return screens
}

module.exports = {
  getEdges,
  externalNodes,
  layoutLevels,
  mainChain,
  exportScreens,
  toMermaid,
  toFlowJson,
  toFlowGraph
}
