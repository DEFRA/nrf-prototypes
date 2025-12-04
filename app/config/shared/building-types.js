/**
 * Building type constants and configuration
 * Centralized definitions for building types used throughout the journey
 */

const BUILDING_TYPES = {
  DWELLINGHOUSE: 'Dwellinghouse',
  HOTEL: 'Hotel',
  HMO: 'House in multiple occupation (HMO)',
  RESIDENTIAL_INSTITUTION: 'Residential institution',
  NON_RESIDENTIAL: 'Non-residential development'
}

// Building types that require room count input (for the room-count page)
const BUILDING_TYPES_REQUIRING_ROOM_COUNT = [
  BUILDING_TYPES.HOTEL,
  BUILDING_TYPES.HMO,
  BUILDING_TYPES.RESIDENTIAL_INSTITUTION
]

// Labels for display (these match the values since they're user-facing strings)
const BUILDING_TYPE_LABELS = {
  [BUILDING_TYPES.DWELLINGHOUSE]: 'Dwelling',
  [BUILDING_TYPES.HOTEL]: 'Hotel',
  [BUILDING_TYPES.HMO]: 'House in multiple occupation (HMO)',
  [BUILDING_TYPES.RESIDENTIAL_INSTITUTION]: 'Residential institution',
  [BUILDING_TYPES.NON_RESIDENTIAL]: 'Non-residential development'
}

// Mapping from building type keys to session data field names
const BUILDING_TYPE_DATA_KEYS = {
  hmo: 'hmoCount',
  hotel: 'hotelCount',
  'residential-institution': 'residentialInstitutionCount'
}

module.exports = {
  BUILDING_TYPES,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT,
  BUILDING_TYPE_LABELS,
  BUILDING_TYPE_DATA_KEYS
}
