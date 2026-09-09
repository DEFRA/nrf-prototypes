/**
 * Environmental Delivery Plan (EDP) data for the maps and boundary checks.
 *
 * Production has one live nutrient EDP: the Broads SAC, Broadland Ramsar and
 * River Wensum SAC plan. Its map layer is the dissolved outline of the
 * nutrient neutrality catchments that feed those designated sites, and its
 * "excluded areas" are the designated sites themselves (development inside
 * them cannot use the EDP).
 *
 * The prototype builds the same thing from the local data: catchments are
 * grouped by their designated site (N2K_Site_N) and each group is dissolved
 * into one EDP, so the live Norfolk EDP matches production exactly and every
 * other catchment still belongs to a (synthetic) EDP for user research.
 *
 * Data is loaded once at startup and cached.
 */

const path = require('path')
const fs = require('fs')
const turf = require('@turf/turf')

const MAP_LAYERS_DIR = path.join(__dirname, '..', '..', 'assets', 'map-layers')
const CATCHMENTS_FILE = path.join(
  MAP_LAYERS_DIR,
  'catchments_nn_catchments_03_2024.geojson'
)
const EXCLUDED_AREAS_FILE = path.join(
  MAP_LAYERS_DIR,
  'edp_excluded_areas.geojson'
)

// The live EDP. Member catchments are matched on their designated site name;
// the label is production's exact wording.
const LIVE_EDPS = [
  {
    id: 'broads-wensum-nutrient',
    label:
      'Broads SAC, Broadland Ramsar and River Wensum SAC Environmental Delivery Plan addressing nutrient pollution (2026 to 2036)',
    sites: ['The Broads SAC', 'River Wensum SAC'],
    excludedAreaSites: [
      'River Wensum SAC',
      'The Broads SAC',
      'Broadland Ramsar'
    ]
  }
]

function readGeojson(filePath) {
  if (!fs.existsSync(filePath)) {
    return { type: 'FeatureCollection', features: [] }
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Catchment edges do not line up exactly, so a union leaves sliver holes and
// fragments along the seams. Anything smaller than this is dropped.
const MIN_RING_AREA_SQM = 250000

function ringArea(ring) {
  return turf.area(turf.polygon([ring]))
}

/**
 * Drop sliver holes and fragments from a dissolved geometry.
 */
function cleanDissolved(geometry) {
  const polygons =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [geometry.coordinates]
  const kept = polygons
    .filter((rings) => ringArea(rings[0]) >= MIN_RING_AREA_SQM)
    .map(([outer, ...holes]) => [
      outer,
      ...holes.filter((hole) => ringArea(hole) >= MIN_RING_AREA_SQM)
    ])
  if (kept.length === 1) {
    return { type: 'Polygon', coordinates: kept[0] }
  }
  return { type: 'MultiPolygon', coordinates: kept }
}

/**
 * Dissolve a set of catchment features into one EDP outline. Falls back to a
 * MultiPolygon of the members if the union fails on an awkward geometry.
 */
function dissolve(features) {
  if (features.length === 1) {
    return features[0].geometry
  }
  try {
    const union = turf.union(turf.featureCollection(features))
    if (union && union.geometry) {
      return cleanDissolved(union.geometry)
    }
  } catch (error) {
    console.warn('[EDP data] Union failed, using MultiPolygon:', error.message)
  }
  const polygons = []
  for (const feature of features) {
    if (feature.geometry.type === 'Polygon') {
      polygons.push(feature.geometry.coordinates)
    } else if (feature.geometry.type === 'MultiPolygon') {
      polygons.push(...feature.geometry.coordinates)
    }
  }
  return { type: 'MultiPolygon', coordinates: polygons }
}

function buildEdps(catchments, excludedAreas) {
  const bySite = new Map()
  for (const feature of catchments.features) {
    const site = feature.properties.N2K_Site_N || feature.properties.Label
    if (!bySite.has(site)) {
      bySite.set(site, [])
    }
    bySite.get(site).push(feature)
  }

  const edps = []
  const claimed = new Set()

  for (const live of LIVE_EDPS) {
    const members = live.sites.flatMap((site) => bySite.get(site) || [])
    live.sites.forEach((site) => claimed.add(site))
    const areas = excludedAreas.features.filter((feature) =>
      live.excludedAreaSites.includes(feature.properties.label)
    )
    edps.push({
      id: live.id,
      label: live.label,
      live: true,
      catchments: members.map((feature) => feature.properties.Label),
      geometry: dissolve(members),
      excludedAreas: areas
    })
  }

  // Every other designated site becomes a synthetic EDP so the journey works
  // anywhere in England during user research
  for (const [site, members] of bySite) {
    if (claimed.has(site)) {
      continue
    }
    edps.push({
      id: slugify(site),
      label: `${site} Environmental Delivery Plan addressing nutrient pollution`,
      live: false,
      catchments: members.map((feature) => feature.properties.Label),
      geometry: dissolve(members),
      excludedAreas: []
    })
  }

  return edps
}

let cache = null

function load() {
  if (!cache) {
    const started = Date.now()
    const catchments = readGeojson(CATCHMENTS_FILE)
    const excludedAreas = readGeojson(EXCLUDED_AREAS_FILE)
    const edps = buildEdps(catchments, excludedAreas)
    const edpFeatures = edps.map((edp) => ({
      type: 'Feature',
      properties: { id: edp.id, label: edp.label, live: edp.live },
      geometry: edp.geometry
    }))
    cache = {
      edps,
      edpBoundaries: turf.featureCollection(edpFeatures),
      excludedAreas
    }
    console.log(
      `[EDP data] Built ${edps.length} EDPs from ${catchments.features.length} catchments and ${excludedAreas.features.length} excluded areas in ${Date.now() - started}ms`
    )
  }
  return cache
}

/** All EDPs, live first. */
function getEdps() {
  return load().edps
}

/** One feature per EDP (dissolved outline) - the map's edp_boundaries layer. */
function getEdpBoundaries() {
  return load().edpBoundaries
}

/** Designated sites excluded from EDPs - the map's edp_excluded_areas layer. */
function getExcludedAreas() {
  return load().excludedAreas
}

/**
 * EDPs a polygon intersects.
 * @param {object} polygon - GeoJSON Polygon feature or geometry
 * @returns {Array<{ id: string, label: string, live: boolean }>}
 */
function findIntersectingEdps(polygon) {
  return getEdps()
    .filter((edp) => turf.booleanIntersects(polygon, edp.geometry))
    .map(({ id, label, live }) => ({ id, label, live }))
}

/**
 * Excluded areas a polygon intersects.
 * @returns {Array<{ label: string, designation: string }>}
 */
function findIntersectingExcludedAreas(polygon) {
  return getExcludedAreas()
    .features.filter((feature) => turf.booleanIntersects(polygon, feature))
    .map((feature) => ({
      label: feature.properties.label,
      designation: feature.properties.designation
    }))
}

module.exports = {
  getEdps,
  getEdpBoundaries,
  getExcludedAreas,
  findIntersectingEdps,
  findIntersectingExcludedAreas
}
