/**
 * Ordnance Survey proxies, ported from the production frontend
 * (nrf-frontend src/server/os-base-map and src/server/os-names-search).
 *
 * The OS API key never reaches the browser. The style JSON in
 * app/assets/data/vts points at /os-base-map/... and the key is added here.
 * Without OS_API_KEY these routes answer 503 and the map offers only the
 * keyless basemaps (see
 * app/assets/javascripts/interactive-map/shared-helpers/styles.js).
 */

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()
const { ProxyAgent, fetch: undiciFetch } = require('undici')

const OS_VTS_URL = 'https://api.os.uk/maps/vector/v1/vts'
const OS_NAMES_URL = 'https://api.os.uk/search/names/v1/find'
const BASE_MAP_PATH = '/os-base-map'
const NAMES_SEARCH_PATH = '/os-names-search'
const DEFAULT_CACHE_CONTROL = 'no-cache'

function getOsApiKey() {
  return process.env.OS_API_KEY || ''
}

if (getOsApiKey()) {
  console.log(`[OS proxy] Registered ${BASE_MAP_PATH} and ${NAMES_SEARCH_PATH}`)
} else {
  console.warn(
    '[OS proxy] OS_API_KEY is not set: Ordnance Survey basemaps and search are disabled, keyless basemaps still work'
  )
}

// Route outbound requests through HTTP_PROXY when one is configured
function fetchUpstream(url) {
  if (process.env.HTTP_PROXY) {
    return undiciFetch(url, {
      dispatcher: new ProxyAgent(process.env.HTTP_PROXY),
      redirect: 'follow'
    })
  }
  return fetch(url, { redirect: 'follow' })
}

function getRequestBaseUrl(req) {
  const forwardedProto = req.get('x-forwarded-proto')
  const protocol = forwardedProto
    ? forwardedProto.split(',')[0].trim()
    : req.protocol
  return `${protocol}://${req.get('host')}`
}

function buildOsBaseMapUrl(subPath, query) {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query || {})) {
    if (typeof value === 'string') {
      params.set(name, value)
    }
  }
  params.set('key', getOsApiKey())
  params.set('srs', '3857')
  const base = subPath ? `${OS_VTS_URL}/${subPath}` : OS_VTS_URL
  return `${base}?${params.toString()}`
}

// Rewrites api.os.uk URLs in JSON responses to route through this proxy,
// stripping query strings so the API key is not leaked to the client.
function rewriteOrdnanceSurveyUrls(body, host) {
  const proxyBase = `${host}${BASE_MAP_PATH}`
  const basePath = new URL(OS_VTS_URL).pathname

  try {
    // Walk every value in the JSON using the parse reviver callback
    const json = JSON.parse(body, (_key, value) => {
      if (typeof value === 'string' && value.startsWith(OS_VTS_URL)) {
        // Keep the sub-path (e.g. /resources/styles) and drop the query
        // string. decodeURIComponent restores MapLibre template tokens like
        // {z}/{y}/{x} that new URL() percent-encodes.
        const subPath = decodeURIComponent(
          new URL(value).pathname.slice(basePath.length)
        )
        return proxyBase + subPath
      }
      return value
    })
    return JSON.stringify(json)
  } catch (error) {
    return body
  }
}

// Binary resources (vector tiles, sprite images) pass through untouched.
// Only JSON responses (style definitions, metadata) get URL rewriting.
function isBinaryPath(subPath) {
  return /\.(pbf|png|jpe?g)$/i.test(subPath)
}

async function proxyOsBaseMap(req, res) {
  if (!getOsApiKey()) {
    return res.status(503).json({ error: 'OS_API_KEY is not set' })
  }

  const subPath = req.params[0] || ''

  try {
    const upstream = await fetchUpstream(buildOsBaseMapUrl(subPath, req.query))
    const contentType = upstream.headers.get('content-type') || ''
    const cacheControl =
      upstream.headers.get('cache-control') || DEFAULT_CACHE_CONTROL

    if (!upstream.ok) {
      console.warn(
        `[OS proxy] Upstream error for ${subPath || '/'}: ${upstream.status}`
      )
      return res
        .status(upstream.status)
        .send(Buffer.from(await upstream.arrayBuffer()))
    }

    res.set('Cache-Control', cacheControl)

    if (isBinaryPath(subPath)) {
      if (contentType) {
        res.set('Content-Type', contentType)
      }
      return res.send(Buffer.from(await upstream.arrayBuffer()))
    }

    const body = await upstream.text()
    res.set('Content-Type', contentType || 'application/json')
    return res.send(rewriteOrdnanceSurveyUrls(body, getRequestBaseUrl(req)))
  } catch (error) {
    console.error(`[OS proxy] Request failed for ${subPath || '/'}:`, error)
    return res.status(502).send('Map tile request failed')
  }
}

router.get(BASE_MAP_PATH, proxyOsBaseMap)
router.get(`${BASE_MAP_PATH}/*`, proxyOsBaseMap)

/**
 * OS Names search, used by the map's search plugin
 * (osNamesURL: '/os-names-search?query={query}')
 */
router.get(NAMES_SEARCH_PATH, async (req, res) => {
  const query =
    typeof req.query.query === 'string' ? req.query.query.trim() : ''

  if (!query || !getOsApiKey()) {
    return res.json({ results: [] })
  }

  const params = new URLSearchParams({ query, key: getOsApiKey() })

  try {
    const upstream = await fetchUpstream(`${OS_NAMES_URL}?${params}`)
    if (!upstream.ok) {
      console.warn(`[OS proxy] OS Names upstream error: ${upstream.status}`)
      return res.status(upstream.status).end()
    }
    return res.json(await upstream.json())
  } catch (error) {
    console.error('[OS proxy] OS Names search request failed:', error)
    return res.status(502).send('OS Names search request failed')
  }
})

module.exports = router
