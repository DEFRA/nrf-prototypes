/**
 * Journey engine: flow graph helpers
 *
 * Everything here reads only journey.yaml (via the loaded definition), so the
 * same graph drives the tools page, the flow.json export and the Mermaid
 * diagram.
 */

const { describeCondition } = require('./expressions')
const { isQuestionType, SUMMARY_TARGET } = require('./loader')

/**
 * Pages a `goto: $summary` rule can return to: every summary page whose
 * rows link to `page` with a Change link, or all summary pages if none do.
 */
function summaryTargetsFor(page, journey) {
  const linking = journey.summaryPages.filter((id) => {
    const summary = journey.byId.get(id)
    return (summary.content.rows || []).some((row) => {
      const targets =
        typeof row.change === 'string'
          ? [row.change]
          : (row.change || []).map((r) => r.goto)
      return targets.includes(page.id)
    })
  })
  return linking.length ? linking : journey.summaryPages
}

function isPageTarget(target, journey) {
  return Boolean(target) && !target.startsWith('/') && journey.byId.has(target)
}

/**
 * The page id when `target` is an absolute path to a page of this journey
 * (`/nrf-request-to-use-1/have-nrl-reference` seen from that journey),
 * otherwise null.
 */
function ownPageId(target, journey) {
  if (
    !target ||
    !journey.basePath ||
    !target.startsWith(`${journey.basePath}/`)
  ) {
    return null
  }
  const id = target.slice(journey.basePath.length + 1)
  return journey.byId.has(id) ? id : null
}
// An absolute path leaves this journey (usually for another journey's page)
function isExternalTarget(target) {
  return Boolean(target) && target.startsWith('/')
}

// Inside a group drawn on its own (see groupScope), a page of the journey
// outside the group is an exit too
function isExitTarget(target, journey) {
  return (
    Boolean(target) &&
    Boolean(journey.exitPaths) &&
    journey.exitPaths.has(target)
  )
}

// A rule's edge label: its condition, or the label a collapsed group gave it
function ruleLabel(rule) {
  if (rule.label !== undefined && rule.label !== '') {
    return rule.label
  }
  return rule.when ? describeCondition(rule.when) : ''
}

const EXTERNAL_HEADING = 'Continues in another journey'

// Default titles for the groups made from the shared provider folders
const GROUP_TITLES = {
  'one-login': 'GOV.UK One Login',
  'government-gateway': 'Government Gateway',
  'defra-id': 'Defra ID'
}

function groupId(name) {
  return `group:${name}`
}

function groupAnchor(name) {
  return `#group-${name}`
}

/**
 * The groups of a journey: every distinct `page.group` (a shared provider
 * folder, or `group:` on a page entry), in order of first appearance, with
 * a title from journey.yaml `groups:`, the defaults above, or the name.
 * Returns [{ id, title, pages: [ids] }].
 */
function journeyGroups(journey) {
  const groups = new Map()
  for (const page of journey.pages) {
    if (!page.group) {
      continue
    }
    if (!groups.has(page.group)) {
      const custom = (journey.groups || {})[page.group] || {}
      groups.set(page.group, {
        id: page.group,
        title:
          custom.title ||
          GROUP_TITLES[page.group] ||
          page.group.replace(/-/g, ' '),
        pages: []
      })
    }
    groups.get(page.group).pages.push(page.id)
  }
  return [...groups.values()]
}

/**
 * The journey with each group folded into one synthetic page, so the main
 * flow and screen wall show "GOV.UK One Login" once instead of every screen
 * of it. Rules of grouped pages that lead out of the group become the
 * synthetic page's rules, labelled with the page they come from. A journey
 * without groups comes back unchanged.
 */
function collapseGroups(journey) {
  const groups = journeyGroups(journey)
  if (!groups.length) {
    return journey
  }
  const groupOf = new Map()
  for (const group of groups) {
    for (const id of group.pages) {
      groupOf.set(id, group.id)
    }
  }
  const mapTarget = (target) =>
    groupOf.has(target) ? groupId(groupOf.get(target)) : target
  const mapRules = (rules) =>
    (rules || []).map((rule) => ({ ...rule, goto: mapTarget(rule.goto) }))
  const mapChange = (change) =>
    typeof change === 'string' ? mapTarget(change) : mapRules(change)

  const pages = []
  const placed = new Set()
  for (const page of journey.pages) {
    if (!page.group) {
      pages.push({
        ...page,
        next: mapRules(page.next),
        content: {
          ...page.content,
          rows: (page.content.rows || []).map((row) => ({
            ...row,
            change: row.change === undefined ? undefined : mapChange(row.change)
          })),
          actions: (page.content.actions || []).map((action) => ({
            ...action,
            goto: action.goto ? mapTarget(action.goto) : action.goto
          }))
        }
      })
      continue
    }
    if (placed.has(page.group)) {
      continue
    }
    placed.add(page.group)
    const group = groups.find((g) => g.id === page.group)
    const own = groupId(group.id)
    const next = []
    const actions = []
    const seenNext = new Set()
    const seenActions = new Set()
    for (const id of group.pages) {
      const member = journey.byId.get(id)
      for (const rule of member.next || []) {
        const goto = mapTarget(rule.goto)
        if (goto === own || rule.goto === SUMMARY_TARGET) {
          continue
        }
        const condition = rule.when ? describeCondition(rule.when) : ''
        const key = `${goto}|${condition}`
        if (seenNext.has(key)) {
          continue
        }
        seenNext.add(key)
        next.push({
          goto,
          when: rule.when,
          label: condition ? `${condition} (via ${id})` : `via ${id}`
        })
      }
      for (const action of member.content.actions || []) {
        const goto = action.goto ? mapTarget(action.goto) : undefined
        if (!goto || goto === own || goto === SUMMARY_TARGET) {
          continue
        }
        if (seenActions.has(goto)) {
          continue
        }
        seenActions.add(goto)
        actions.push({ ...action, goto, text: `${action.text} (${id})` })
      }
    }
    // One default rule at most, last as usual: the first default found (in
    // page order) is the group's; other unconditional exits keep their
    // label as the reason
    const conditional = next.filter((rule) => rule.when)
    const defaults = next.filter((rule) => !rule.when)
    const ordered = [...conditional, ...defaults.slice(1)]
    if (defaults.length) {
      ordered.push({ ...defaults[0], label: '' })
    }
    pages.push({
      id: own,
      path: groupAnchor(group.id),
      type: 'group',
      group: group.id,
      groupTitle: group.title,
      groupCount: group.pages.length,
      next: ordered,
      content: { heading: group.title, rows: [], actions, body: '' }
    })
  }
  const byId = new Map(pages.map((page) => [page.id, page]))
  return {
    ...journey,
    pages,
    byId,
    start: mapTarget(journey.start),
    summaryPages: journey.summaryPages.filter((id) => !groupOf.has(id)),
    collapsed: true
  }
}

const GROUP_EXIT_HEADING = 'Back in the journey'

/**
 * One group as a journey of its own: its pages, entered at the first page
 * reached from outside, with every other page of the journey available as
 * an exit (drawn like an exit to another journey, labelled "Back in the
 * journey").
 */
function groupScope(journey, group) {
  const members = new Set(group.pages)
  const pages = journey.pages.filter((page) => members.has(page.id))
  // Entered where a form submission or link from outside first lands
  // (return edges to a summary page inside the group do not count)
  const entered = getEdges(journey)
    .filter(
      (edge) =>
        ['next', 'link'].includes(edge.kind) &&
        !members.has(edge.fromId) &&
        members.has(edge.toId)
    )
    .map((edge) => edge.toId)
  const start = entered.length ? entered[0] : pages[0].id
  const exitPaths = new Map()
  for (const page of journey.pages) {
    if (!members.has(page.id)) {
      exitPaths.set(page.id, page.path)
    }
  }
  return {
    ...journey,
    pages,
    byId: new Map(pages.map((page) => [page.id, page])),
    start,
    summaryPages: journey.summaryPages.filter((id) => members.has(id)),
    exitPaths,
    exitHeading: GROUP_EXIT_HEADING,
    scope: group.id
  }
}

/**
 * The tools page's sections: the main journey with groups collapsed, then
 * one section per group with its own rows and flow graph.
 */
function journeySections(journey) {
  const collapsed = collapseGroups(journey)
  return {
    main: {
      levels: layoutLevels(collapsed),
      graph: toFlowGraph(collapsed)
    },
    groups: journeyGroups(journey).map((group) => {
      const scope = groupScope(journey, group)
      return {
        id: group.id,
        title: group.title,
        anchor: groupAnchor(group.id),
        count: group.pages.length,
        levels: layoutLevels(scope),
        graph: toFlowGraph(scope)
      }
    })
  }
}

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
      if (rule.goto === SUMMARY_TARGET) {
        for (const toId of summaryTargetsFor(page, journey)) {
          add({
            fromId: page.id,
            toId,
            label: rule.when ? describeCondition(rule.when) : '',
            kind: 'return'
          })
        }
      } else if (isPageTarget(rule.goto, journey)) {
        const isReturn =
          Boolean(rule.when) &&
          JSON.stringify(rule.when).includes('$navFromSummary')
        add({
          fromId: page.id,
          toId: rule.goto,
          label: ruleLabel(rule),
          kind: isReturn ? 'return' : 'next'
        })
      } else if (isExternalTarget(rule.goto)) {
        add({
          fromId: page.id,
          toId: rule.goto,
          label: ruleLabel(rule),
          kind: 'next',
          external: true
        })
      } else if (isExitTarget(rule.goto, journey)) {
        add({
          fromId: page.id,
          toId: journey.exitPaths.get(rule.goto),
          label: ruleLabel(rule),
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
        } else if (isExternalTarget(target) || isExitTarget(target, journey)) {
          // A Change link that borrows another journey's page (or, inside a
          // group, leaves the group)
          add({
            fromId: page.id,
            toId: isExternalTarget(target)
              ? target
              : journey.exitPaths.get(target),
            label: `Change ${row.key}`,
            kind: 'change',
            external: true
          })
        }
      }
    }
    for (const action of page.content.actions || []) {
      // A shared page may link into this journey by absolute path (the
      // Defra account guidance's button); that is a page here, not an exit
      const ownPage = ownPageId(action.goto, journey)
      if (isPageTarget(action.goto, journey) || ownPage) {
        add({
          fromId: page.id,
          toId: ownPage || action.goto,
          label: action.text,
          kind: 'link'
        })
      } else if (
        isExternalTarget(action.goto) ||
        isExitTarget(action.goto, journey)
      ) {
        add({
          fromId: page.id,
          toId: isExternalTarget(action.goto)
            ? action.goto
            : journey.exitPaths.get(action.goto),
          label: action.text,
          kind: 'link',
          external: true
        })
      }
    }
    // User research links (`research:` in journey.yaml) to pages of this
    // journey, so a page only opened that way still hangs off the page
    // that offers it; links elsewhere are facilitator shortcuts, not flow
    for (const link of page.research || []) {
      const ownPage = ownPageId(link.href.replace(/[?#].*$/, ''), journey)
      if (ownPage) {
        add({ fromId: page.id, toId: ownPage, label: link.text, kind: 'link' })
      }
    }
    // Links inside the markdown body to other pages in this journey, by
    // absolute path or by `./page-id`
    const linkPattern = new RegExp(
      `\\]\\((?:${journey.basePath}|\\.)/([a-z0-9-]+)\\)`,
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
        heading: journey.exitHeading || EXTERNAL_HEADING,
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
    let detail = ''
    if (edge.label && edge.kind === 'next') {
      detail = `, if ${edge.label}`
    } else if (edge.label) {
      detail = ` (${edge.label})`
    }
    rows[rowIndex].pages.push({
      id: edge.toId,
      path: edge.toId,
      heading: journey.exitHeading || EXTERNAL_HEADING,
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
    const label = mermaidLabel(`${node.path}\n${node.heading}`)
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
    if (page.type === 'group') {
      kind = 'group'
    } else if (page.id === journey.start) {
      kind = 'start'
    } else if (page.type === 'confirmation') {
      kind = 'confirmation'
    } else if (isExit) {
      kind = 'exit'
    }
    return {
      id: page.id,
      heading:
        page.type === 'group'
          ? `${page.groupCount} screens, see below`
          : shortHeading(page),
      path: page.path,
      kind,
      // Group nodes link to their section on the page, not to a screen
      anchor: page.type === 'group',
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
 * The named preview variants of a page (`preview.variants` in journey.yaml
 * or the page's frontmatter): [{ id, label }].
 */
function previewVariants(page) {
  const variants = (page.preview && page.preview.variants) || []
  return variants
    .filter((variant) => variant && variant.id)
    .map((variant) => ({
      id: String(variant.id),
      label: variant.label || String(variant.id)
    }))
}

// The section ids an export can pick from: the main journey and each group
const MAIN_SECTION = 'main'

function exportSections(journey) {
  return [
    { id: MAIN_SECTION, title: 'Main journey' },
    ...journeyGroups(journey).map((group) => ({
      id: group.id,
      title: group.title
    }))
  ]
}

/**
 * Every screen to capture for a JPG export, in screen-wall order (each
 * main-chain page followed by its branches, unreached pages last): the main
 * journey with its groups folded, then each group. Question and custom
 * pages get a second entry showing their error state unless
 * `includeErrors` is false, and a page with `preview.variants` gets one
 * entry per variant. `sections` picks which parts to export ('main' and
 * group ids; all by default). A journey with groups files each section in
 * a folder of its own; one without keeps a flat list.
 *
 * @param {object} journey  loaded journey definition
 * @param {object} options  { includeErrors, sections }
 * @returns [{ id, section, type, path, url, file, error, variant }]
 */
function exportScreens(journey, options = {}) {
  const includeErrors = options.includeErrors !== false
  const available = exportSections(journey).map((section) => section.id)
  const wanted = Array.isArray(options.sections)
    ? options.sections.filter((id) => available.includes(id))
    : available
  const layout = journeySections(journey)
  const parts = [
    { id: MAIN_SECTION, levels: layout.main.levels },
    ...layout.groups.map((group) => ({ id: group.id, levels: group.levels }))
  ].filter((part) => wanted.includes(part.id))
  const inFolders = layout.groups.length > 0
  const screens = []
  let index = 0
  for (const part of parts) {
    const folder = inFolders ? `${part.id}/` : ''
    for (const row of part.levels) {
      for (const { id, external } of row.pages) {
        if (external || id.startsWith('group:')) {
          continue
        }
        const page = journey.byId.get(id)
        index += 1
        const prefix = String(index).padStart(2, '0')
        const entry = (suffix, url, extra) => ({
          id,
          section: part.id,
          type: page.type,
          path: page.path,
          url: `${page.path}?preview=1&embed=1${url}`,
          file: `${folder}${prefix}-${id}${suffix}.jpg`,
          error: false,
          variant: null,
          ...extra
        })
        screens.push(entry('', '', {}))
        if (
          includeErrors &&
          (isQuestionType(page.type) || page.type === 'custom')
        ) {
          screens.push(entry('--error', '&error=1', { error: true }))
        }
        for (const variant of previewVariants(page)) {
          screens.push(
            entry(`--${variant.id}`, `&variant=${variant.id}`, {
              variant: variant.id
            })
          )
        }
      }
    }
  }
  return screens
}

module.exports = {
  previewVariants,
  journeyGroups,
  collapseGroups,
  groupScope,
  journeySections,
  exportSections,
  getEdges,
  externalNodes,
  layoutLevels,
  mainChain,
  exportScreens,
  toMermaid,
  toFlowJson,
  toFlowGraph
}
