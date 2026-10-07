import {
  PLUGIN_THUMBNAIL_BASE_URL,
  VTS_STYLE_BASE_URL,
  VTS_THUMBNAIL_BASE_URL
} from './constants.js'

function getOrdnanceSurveyAttribution() {
  return `&copy; Crown copyright and database rights ${new Date().getFullYear()} Ordnance Survey`
}

// Production reads the APGB credit back from the style JSON's sources (the
// browser modules here cannot import JSON), so it is repeated from
// app/assets/data/vts/APGB_Aerial.json and APGB_Hybrid.json. The APGB styles
// also mask the sea with Ordnance Survey coastline geometry, so both licences
// have to appear.
const APGB_COPYRIGHT =
  '© Bluesky International Limited 2021 and onwards | ' +
  '© Bluesky International Limited and Getmapping Limited 1999-2020'

function getApgbAttribution() {
  return [APGB_COPYRIGHT, getOrdnanceSurveyAttribution()].join(' | ')
}

// Production's styles (nrf-frontend src/client/javascripts/map/shared-helpers/
// styles.js, PR #490), in production's order: Hybrid is the default. Hybrid
// and Aerial need the impact assessor's aerial imagery and Ordnance Survey's
// tiles; the OS styles need only the OS key.
const APGB_STYLES = [
  {
    id: 'hybrid',
    label: 'Hybrid',
    url: `${VTS_STYLE_BASE_URL}/APGB_Hybrid.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/hybrid.jpg`,
    attribution: getApgbAttribution()
  },
  {
    id: 'aerial',
    label: 'Aerial',
    url: `${VTS_STYLE_BASE_URL}/APGB_Aerial.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/aerial.jpg`,
    attribution: getApgbAttribution()
  }
]

const OS_STYLES = [
  {
    id: 'outdoor-os',
    label: 'Outdoor OS',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Outdoor.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/outdoor-os.jpg`,
    attribution: getOrdnanceSurveyAttribution()
  },
  {
    id: 'dark',
    label: 'Dark',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Dark.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/dark.jpg`,
    attribution: getOrdnanceSurveyAttribution()
  },
  {
    id: 'black-and-white',
    label: 'Black and white',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Black_and_White.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/black-and-white.jpg`,
    attribution: getOrdnanceSurveyAttribution()
  }
]

// The Ordnance Survey styles as the maps had them before production's
// Hybrid and Aerial arrived, kept for quote V7 (a map without
// data-production-map), with the interactive-map package's thumbnails
const PROTOTYPE_OS_STYLES = [
  {
    id: 'outdoor-os',
    label: 'Outdoor OS',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Outdoor.json`,
    thumbnail: `${PLUGIN_THUMBNAIL_BASE_URL}/outdoor-map-thumb.jpg`,
    attribution: getOrdnanceSurveyAttribution(),
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'dark',
    label: 'Dark',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Dark.json`,
    thumbnail: `${PLUGIN_THUMBNAIL_BASE_URL}/dark-map-thumb.jpg`,
    attribution: getOrdnanceSurveyAttribution(),
    mapColorScheme: 'dark',
    appColorScheme: 'dark'
  },
  {
    id: 'black-and-white',
    label: 'Black and white',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Black_and_White.json`,
    thumbnail: `${PLUGIN_THUMBNAIL_BASE_URL}/black-and-white-map-thumb.jpg`,
    attribution: getOrdnanceSurveyAttribution()
  }
]

// Basemaps that need no key, for a prototype run without the impact
// assessor's aerial imagery (a laptop with no .env, say). Satellite stands
// in for production's aerial default.
const SATELLITE_COPYRIGHT =
  '&copy; Bluesky International Limited 2021 and onwards | ' +
  '&copy; Bluesky International Limited and Getmapping Limited 1999-2020'

const SATELLITE_STYLE = {
  id: 'esri-tiles',
  label: 'Satellite',
  url: `${VTS_STYLE_BASE_URL}/ESRI_World_Imagery.json`,
  thumbnail: `${PLUGIN_THUMBNAIL_BASE_URL}/aerial-map-thumb.jpg`,
  // Spike: trying the Bluesky aerial imagery notice (not Esri's) to see how a
  // long, two-part copyright reads on one line. Most recent period first.
  // On mobile it truncates with an ellipsis; see .app-map-attribution in
  // app/assets/sass/_interactive-map.scss
  attribution: `<span class="app-map-attribution">${SATELLITE_COPYRIGHT}</span>`,
  mapColorScheme: 'dark'
}

const STREETS_STYLE = {
  id: 'openfreemap',
  label: 'Streets',
  url: 'https://tiles.openfreemap.org/styles/liberty',
  thumbnail: `${PLUGIN_THUMBNAIL_BASE_URL}/road-ofm-thumb.jpg`,
  attribution: 'OpenFreeMap &copy; OpenMapTiles Data from OpenStreetMap',
  backgroundColor: '#f5f5f0'
}

// On a production map without the keys, the keyless styles wear
// production's thumbnails: Satellite is aerial imagery like Aerial, Streets
// a street map like Outdoor OS
const PRODUCTION_KEYLESS_THUMBNAILS = {
  [SATELLITE_STYLE.id]: `${VTS_THUMBNAIL_BASE_URL}/aerial.jpg`,
  [STREETS_STYLE.id]: `${VTS_THUMBNAIL_BASE_URL}/outdoor-os.jpg`
}

/**
 * The first style is the default. A production map (data-production-map, on
 * quote V7.1's pages) with both keys offers exactly production's styles;
 * Ordnance Survey styles need OS_API_KEY (see app/routes/os-base-map.js) and
 * Hybrid and Aerial also need the impact assessor's aerial imagery,
 * IMPACT_ASSESSOR_BASE_URL (see app/routes/tileserver-proxy.js). Otherwise
 * the keyless Satellite and Streets stand in, with the OS styles when there
 * is a key.
 *
 * @param {{ hasOsKey?: boolean, hasAerial?: boolean, production?: boolean }} [params]
 */
export function getMapStyles({
  hasOsKey = false,
  hasAerial = false,
  production = false
} = {}) {
  let styles
  if (production && hasOsKey && hasAerial) {
    styles = [...APGB_STYLES, ...OS_STYLES]
  } else if (hasOsKey) {
    styles = [
      SATELLITE_STYLE,
      ...(production ? OS_STYLES : PROTOTYPE_OS_STYLES),
      STREETS_STYLE
    ]
  } else {
    styles = [SATELLITE_STYLE, STREETS_STYLE]
  }

  // interactive-map hides the copyright at its mobile breakpoint unless the
  // style opts in; the APGB, OS and Esri licence terms require the credit on
  // every device
  return styles.map((style) => ({
    ...style,
    thumbnail:
      (production && PRODUCTION_KEYLESS_THUMBNAILS[style.id]) ||
      style.thumbnail,
    showAttributionOnMobile: true
  }))
}
