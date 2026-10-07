/**
 * The sea mask under the Hybrid and Aerial basemaps, ported from nrf-frontend
 * src/server/os-base-map/sea-mask (PR #490). APGB aerial imagery stops at the
 * coast, so each tile is the Ordnance Survey tile's land cut out of a square:
 * whatever is left is sea, which the styles paint blue
 * (app/assets/data/vts/APGB_Aerial.json and APGB_Hybrid.json).
 *
 * The production modules (extract-land-rings, subtract-land, encode-sea-tile,
 * build-sea-mask-tile, is-tile-outside-england) are kept as one function each
 * here; app/routes/os-base-map.js serves the tiles.
 */
const { VectorTile } = require('@mapbox/vector-tile')
const { PbfReader } = require('pbf')
const polyclip = require('polyclip-ts')
const vtPbf = require('vt-pbf')

const SEA_LAYER_NAME = 'sea'

// Only GB carries aerial imagery. Ireland and the continent are land, but the
// imagery is blank there too, so they are masked and then recoloured by their
// own layer rather than being left as holes in the sea.
const LAND_LAYER_NAMES = ['GB_land']
const POLYGON_FEATURE_TYPE = 3
const VECTOR_TILE_SPEC_VERSION = 2

// The same box the map is held within, so every tile a user can pan to is
// still masked against the real coastline. A copy of ENGLAND_MAX_BOUNDS in
// app/assets/javascripts/interactive-map/shared-helpers/constants.js
// (a browser module the server cannot require). [west, south, east, north]
const ENGLAND_MAX_BOUNDS = [-7.5, 49.5, 2.5, 56.2]

/**
 * OS tiles carry a small overlap beyond the tile edge. Differencing against the
 * unbuffered box would leave a hairline of unmasked imagery along every shared
 * edge, so the buffer is measured and handed on with the rings.
 */
function getLayerBuffer(layer) {
  let buffer = 0

  for (let index = 0; index < layer.length; index++) {
    const [left, top, right, bottom] = layer.feature(index).bbox()
    buffer = Math.max(
      buffer,
      -left,
      -top,
      right - layer.extent,
      bottom - layer.extent
    )
  }

  return Math.max(buffer, 0)
}

/**
 * @param {Buffer} tileBuffer
 * @returns {{ rings: number[][][], extent: number, buffer: number }}
 */
function extractLandRings(tileBuffer) {
  const tile = new VectorTile(new PbfReader(tileBuffer))
  const rings = []
  let extent = 4096
  let buffer = 0

  for (const name of LAND_LAYER_NAMES) {
    const layer = tile.layers[name]
    if (!layer) {
      continue
    }

    extent = layer.extent
    buffer = Math.max(buffer, getLayerBuffer(layer))

    for (let index = 0; index < layer.length; index++) {
      const feature = layer.feature(index)
      if (feature.type !== POLYGON_FEATURE_TYPE) {
        continue
      }

      for (const ring of feature.loadGeometry()) {
        if (ring.length < 4) {
          continue
        }
        rings.push(ring.map((point) => [point.x, point.y]))
      }
    }
  }

  return { rings, extent, buffer }
}

/**
 * @returns {number[][]} A closed ring covering the tile plus its overlap buffer.
 */
function getTileRing({ extent, buffer }) {
  const min = buffer > 0 ? -buffer : 0
  const max = extent + buffer

  return [
    [min, min],
    [max, min],
    [max, max],
    [min, max],
    [min, min]
  ]
}

/**
 * @returns {number[][][][]} Sea polygons in tile-local coordinates.
 */
function subtractLandFromTile({ rings, extent, buffer }) {
  const tile = [getTileRing({ extent, buffer })]

  if (rings.length === 0) {
    return [tile]
  }

  return polyclip.difference(tile, ...rings.map((ring) => [ring]))
}

/**
 * @returns {Buffer}
 */
function encodeSeaTile({ polygons, extent }) {
  const features = polygons.map(function toFeature(rings, id) {
    return { id, type: POLYGON_FEATURE_TYPE, tags: {}, geometry: rings }
  })

  return Buffer.from(
    vtPbf.fromGeojsonVt(
      { [SEA_LAYER_NAME]: { features } },
      { version: VECTOR_TILE_SPEC_VERSION, extent }
    )
  )
}

/**
 * @param {Buffer} tileBuffer An OS vector tile.
 * @returns {Buffer} A single-layer tile holding the water part of the same tile.
 */
function buildSeaMaskTile(tileBuffer) {
  const { rings, extent, buffer } = extractLandRings(tileBuffer)
  const polygons = subtractLandFromTile({ rings, extent, buffer })

  return encodeSeaTile({ polygons, extent })
}

function tileToLongitude({ x, z }) {
  return (x / 2 ** z) * 360 - 180
}

function tileToLatitude({ y, z }) {
  const mercatorY = Math.PI * (1 - (2 * y) / 2 ** z)
  return (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI
}

/**
 * @param {{ z: number, x: number, y: number }} tile
 * @returns {boolean}
 */
function isTileOutsideEngland({ z, x, y }) {
  const [westBound, southBound, eastBound, northBound] = ENGLAND_MAX_BOUNDS
  const west = tileToLongitude({ x, z })
  const east = tileToLongitude({ x: x + 1, z })
  const north = tileToLatitude({ y, z })
  const south = tileToLatitude({ y: y + 1, z })

  return (
    east < westBound ||
    west > eastBound ||
    north < southBound ||
    south > northBound
  )
}

module.exports = { buildSeaMaskTile, isTileOutsideEngland }
