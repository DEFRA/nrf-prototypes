import { VTS_STYLE_BASE_URL, VTS_THUMBNAIL_BASE_URL } from './constants.js'

function getOrdnanceSurveyAttribution() {
  return `&copy; Crown copyright and database rights ${new Date().getFullYear()} Ordnance Survey`
}

const OS_STYLES = [
  {
    id: 'outdoor-os',
    label: 'Outdoor OS',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Outdoor.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/outdoor-map-thumb.jpg`,
    attribution: getOrdnanceSurveyAttribution(),
    backgroundColor: '#f5f5f0'
  },
  {
    id: 'dark',
    label: 'Dark',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Dark.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/dark-map-thumb.jpg`,
    attribution: getOrdnanceSurveyAttribution(),
    mapColorScheme: 'dark',
    appColorScheme: 'dark'
  },
  {
    id: 'black-and-white',
    label: 'Black and white',
    url: `${VTS_STYLE_BASE_URL}/OS_VTS_3857_Black_and_White.json`,
    thumbnail: `${VTS_THUMBNAIL_BASE_URL}/black-and-white-map-thumb.jpg`,
    attribution: getOrdnanceSurveyAttribution()
  }
]

// Basemaps that need no API key. Satellite is the default, whether or not
// OS styles are offered, as production defaults to aerial imagery
const SATELLITE_STYLE = {
  id: 'esri-tiles',
  label: 'Satellite',
  url: `${VTS_STYLE_BASE_URL}/ESRI_World_Imagery.json`,
  thumbnail: `${VTS_THUMBNAIL_BASE_URL}/aerial-map-thumb.jpg`,
  // Spike: trying the Bluesky aerial imagery notice (not Esri's) to see how a
  // long, two-part copyright reads on one line. Most recent period first.
  // The button truncates on mobile and expands on tap, one statement per
  // line; see .app-map-attribution in app/assets/sass/_interactive-map.scss
  // and attribution.js
  attribution:
    '<button type="button" class="app-map-attribution" aria-expanded="false">' +
    '<span class="app-map-attribution__statement">' +
    '&copy; Bluesky International Limited 2021 and onwards</span>' +
    '<span class="app-map-attribution__separator"> | </span>' +
    '<span class="app-map-attribution__statement">' +
    '&copy; Bluesky International Limited and Getmapping Limited 1999-2020' +
    '</span></button>',
  mapColorScheme: 'dark'
}

const STREETS_STYLE = {
  id: 'openfreemap',
  label: 'Streets',
  url: 'https://tiles.openfreemap.org/styles/liberty',
  thumbnail: `${VTS_THUMBNAIL_BASE_URL}/road-ofm-thumb.jpg`,
  attribution: 'OpenFreeMap &copy; OpenMapTiles Data from OpenStreetMap',
  backgroundColor: '#f5f5f0'
}

/**
 * The first style is the default. Ordnance Survey styles are only offered
 * when the server has an OS_API_KEY (see app/routes/os-base-map.js).
 *
 * @param {{ hasOsKey?: boolean }} [params]
 */
export function getMapStyles({ hasOsKey = false } = {}) {
  const styles = hasOsKey
    ? [SATELLITE_STYLE, ...OS_STYLES, STREETS_STYLE]
    : [SATELLITE_STYLE, STREETS_STYLE]

  // interactive-map hides the copyright at its mobile breakpoint by default;
  // the OS and Esri terms require it on every device
  return styles.map((style) => ({ ...style, showAttributionOnMobile: true }))
}
