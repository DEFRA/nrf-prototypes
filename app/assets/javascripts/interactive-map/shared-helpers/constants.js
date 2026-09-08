// Style JSON lives in app/assets/data/vts, which the Prototype Kit serves at
// /public/data/vts – the same path production uses.
export const VTS_STYLE_BASE_URL = '/public/data/vts'

// Thumbnails ship with the @defra/interactive-map package
export const VTS_THUMBNAIL_BASE_URL =
  '/plugin-assets/%40defra%2Finteractive-map/assets/images'

export const BOUNDARY_MAP_MAX_ZOOM = 18

const NORFOLK_LONGITUDE = 1.1405503
const NORFOLK_LATITUDE = 52.7089441

export const DEFAULT_MAP_CENTER = [NORFOLK_LONGITUDE, NORFOLK_LATITUDE]
