/**
 * Journey engine: flow graph helpers
 *
 * Everything here reads only journey.yaml (via the loaded definition), so the
 * same graph drives the tools page, the flow.json export and the Mermaid
 * diagram.
 */

const { describeCondition } = require('./expressions')

function isPageTarget(target, journey) {
  return Boolean(target) && !target.startsWith('/') && journey.byId.has(target)
}

/**
 * Edges: { fromId, toId, label, kind } where kind is
 * 'next' (form submission), 'change' (summary change link) or 'link'
 * (an action button/link on the page).
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
 * Breadth-first levels from the start page. Each level is a list of page
 * ids; the default (main-chain) target is placed first within a level.
 * Unreachable pages are appended as a final level.
 */
function layoutLevels(journey) {
  const edges = getEdges(journey)
  const outgoing = new Map()
  for (const edge of edges) {
    if (!outgoing.has(edge.fromId)) {
      outgoing.set(edge.fromId, [])
    }
    outgoing.get(edge.fromId).push(edge)
  }
  // Pass 1: the main flow (form submissions only, no return-to-summary edges)
  const level = new Map([[journey.start, 0]])
  const queue = [journey.start]
  while (queue.length) {
    const id = queue.shift()
    for (const edge of (outgoing.get(id) || []).filter(
      (e) => e.kind === 'next'
    )) {
      if (!level.has(edge.toId)) {
        level.set(edge.toId, level.get(id) + 1)
        queue.push(edge.toId)
      }
    }
  }
  // Pass 2: pages only reached by links or change links sit one level after
  // whichever placed page links to them
  let placed = true
  while (placed) {
    placed = false
    for (const edge of edges) {
      if (level.has(edge.fromId) && !level.has(edge.toId)) {
        level.set(edge.toId, level.get(edge.fromId) + 1)
        placed = true
      }
    }
  }
  const levels = []
  for (const page of journey.pages) {
    if (!level.has(page.id)) {
      continue
    }
    const depth = level.get(page.id)
    levels[depth] = levels[depth] || []
    levels[depth].push(page.id)
  }
  // Within a level keep BFS discovery order (main chain first)
  const order = [...level.keys()]
  for (const group of levels) {
    if (group) {
      group.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    }
  }
  const unreachable = journey.pages
    .map((p) => p.id)
    .filter((id) => !level.has(id))
  if (unreachable.length) {
    levels.push(unreachable)
  }
  return levels.filter(Boolean)
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
  const lines = ['flowchart TD']
  for (const page of journey.pages) {
    const label = mermaidLabel(`${page.id}\n${shortHeading(page)}`)
    lines.push(`  ${page.id}["${label}"]`)
  }
  for (const edge of getEdges(journey)) {
    const arrow = edge.kind === 'next' ? '-->' : '-.->'
    const text = edge.kind === 'return' ? `return: ${edge.label}` : edge.label
    const label = text ? `|"${mermaidLabel(edgeLabel(text))}"|` : ''
    lines.push(`  ${edge.fromId} ${arrow}${label} ${edge.toId}`)
  }
  for (const page of journey.pages) {
    lines.push(`  click ${page.id} "${page.path}${suffix}" _blank`)
  }
  const exits = journey.pages
    .filter((p) => !(p.next && p.next.length))
    .map((p) => p.id)
  lines.push('  classDef exit fill:#f3f2f1,stroke:#505a5f,color:#0b0c0c')
  lines.push('  classDef start fill:#00703c,stroke:#00703c,color:#ffffff')
  lines.push('  classDef question fill:#ffffff,stroke:#1d70b8,color:#0b0c0c')
  if (exits.length) {
    lines.push(`  class ${exits.join(',')} exit`)
  }
  lines.push(`  class ${journey.start} start`)
  return lines.join('\n')
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
      onPage: getEdges(journey).map((edge) => ({
        fromId: edge.fromId,
        fromName: nameOf(edge.fromId),
        toId: edge.toId,
        toName: nameOf(edge.toId),
        label: edge.label,
        kind: edge.kind
      })),
      offPage: []
    }
  }
}

module.exports = { getEdges, layoutLevels, toMermaid, toFlowJson }
