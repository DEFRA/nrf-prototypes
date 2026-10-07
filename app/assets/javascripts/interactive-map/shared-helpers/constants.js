// Style JSON lives in app/assets/data/vts, which the Prototype Kit serves at
// /public/data/vts – the same path production uses.
export const VTS_STYLE_BASE_URL = '/public/data/vts'

// Production's thumbnails (copied from nrf-frontend's
// src/client/data/vts/thumbnails), at the same path production uses
export const VTS_THUMBNAIL_BASE_URL = '/public/data/vts/thumbnails'

// The keyless basemaps' thumbnails ship with the @defra/interactive-map
// package
export const PLUGIN_THUMBNAIL_BASE_URL =
  '/plugin-assets/%40defra%2Finteractive-map/assets/images'

export const BOUNDARY_MAP_MAX_ZOOM = 18

// The APGB aerial WMTS tile matrix stops at zoom 21, and MapLibre's default
// map maximum is 22 — so without this cap the aerial style maxes out one zoom
// lower than the OS vector styles. 21 is the lowest common maximum every
// basemap can genuinely serve.
export const DRAW_MAP_MAX_ZOOM = 21

const NORFOLK_LONGITUDE = 1.1405503
const NORFOLK_LATITUDE = 52.7089441

export const DEFAULT_MAP_CENTER = [NORFOLK_LONGITUDE, NORFOLK_LATITUDE]

// England plus a margin, so a boundary on the coast or the Welsh or Scottish
// border can still be seen in context. [west, south, east, north]
// app/lib/map/sea-mask/is-tile-outside-england.js keeps a copy for the server.
export const ENGLAND_MAX_BOUNDS = [-7.5, 49.5, 2.5, 56.2]
