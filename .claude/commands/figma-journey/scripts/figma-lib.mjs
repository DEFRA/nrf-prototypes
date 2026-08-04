// Shared helpers for the figma-journey scripts (figma-extract / figma-images /
// figma-reconcile). Imported, never run directly. No npm deps (Node 22 global
// fetch). Never prints the FIGMA_TOKEN.

const API_BASE = 'https://api.figma.com/v1'
const SETUP_DOC = '.claude/skills/figma-journey/references/setup.md'
const HTTP_OK = 200

function fail(message) {
  console.error(message)
  process.exit(1)
}

// Parse argv into { location, nodeFlag } — a positional URL/key plus an optional
// `--node <A-B>` override.
function parseArgs(argv) {
  let location = null
  let nodeFlag = null
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--node') {
      nodeFlag = argv[i + 1]
      i += 1
    } else if (!location) {
      location = argv[i]
    }
  }
  return { location, nodeFlag }
}

// Derive { fileKey, nodeId } from a Figma URL, a "KEY#node" string, or a bare
// fileKey. `nodeFlag` (from --node) overrides any node in the location. The node
// id is normalised to the API's colon form (3452-31002 -> 3452:31002).
function parseLocation(location, nodeFlag) {
  let fileKey = null
  let nodeId = null
  if (location && location.includes('figma.com')) {
    const url = new URL(location)
    const match = url.pathname.match(/\/(?:proto|file|design)\/([A-Za-z0-9]+)/)
    fileKey = match ? match[1] : null
    nodeId = url.searchParams.get('node-id')
  } else if (location && location.includes('#')) {
    const [key, node] = location.split('#')
    fileKey = key
    nodeId = node
  } else {
    fileKey = location
  }
  if (nodeFlag) {
    nodeId = nodeFlag
  }
  if (nodeId) {
    nodeId = nodeId.replaceAll('-', ':')
  }
  return { fileKey, nodeId }
}

async function figmaGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-Figma-Token': token }
  })
  const body = await res.json().catch(() => ({}))
  if (res.status !== HTTP_OK) {
    fail(`Figma API ${res.status}: ${body.err || res.statusText}`)
  }
  return body
}

// The frames (screen roots) under a page node: a CANVAS's FRAME children, or the
// node itself when a single frame was requested.
function collectScreens(document) {
  if (document.type === 'CANVAS') {
    return (document.children || []).filter((c) => c.type === 'FRAME')
  }
  return [document]
}

export { API_BASE, SETUP_DOC, HTTP_OK, fail, parseArgs, parseLocation, figmaGet, collectScreens }
