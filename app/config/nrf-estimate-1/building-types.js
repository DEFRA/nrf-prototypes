/**
 * Building type constants and configuration
 * Centralized definitions for building types used throughout the journey
 */

const BUILDING_TYPES = {
  DWELLINGHOUSE: 'Dwellinghouse',
  HOTEL: 'Hotel',
  HMO: 'House of multiple occupation (HMO)',
  RESIDENTIAL_INSTITUTION: 'Residential institution',
  NON_RESIDENTIAL: 'Non-residential development'
}

// Building types that require room count input (for the room-count page)
const BUILDING_TYPES_REQUIRING_ROOM_COUNT = [
  BUILDING_TYPES.HOTEL,
  BUILDING_TYPES.HMO,
  BUILDING_TYPES.RESIDENTIAL_INSTITUTION
]

// Building types that go to residential page (dwellinghouse details)
const BUILDING_TYPES_REQUIRING_RESIDENTIAL_DETAILS = [
  BUILDING_TYPES.DWELLINGHOUSE
]

// Labels for display (these match the values since they're user-facing strings)
const BUILDING_TYPE_LABELS = {
  [BUILDING_TYPES.DWELLINGHOUSE]: 'Dwellinghouse',
  [BUILDING_TYPES.HOTEL]: 'Hotel',
  [BUILDING_TYPES.HMO]: 'House of multiple occupation (HMO)',
  [BUILDING_TYPES.RESIDENTIAL_INSTITUTION]: 'Residential institution',
  [BUILDING_TYPES.NON_RESIDENTIAL]: 'Non-residential development'
}

// Room count field names for each building type
const ROOM_COUNT_FIELDS = {
  [BUILDING_TYPES.DWELLINGHOUSE]: {
    bedrooms: 'Number of bedrooms',
    bathrooms: 'Number of bathrooms',
    otherRooms: 'Number of other rooms'
  },
  [BUILDING_TYPES.HOTEL]: {
    rooms: 'Number of hotel rooms'
  },
  [BUILDING_TYPES.HMO]: {
    rooms: 'Number of HMO rooms'
  },
  [BUILDING_TYPES.RESIDENTIAL_INSTITUTION]: {
    residentialUnits: 'Number of residential units'
  },
  [BUILDING_TYPES.NON_RESIDENTIAL]: {
    rooms: 'Number of rooms or spaces'
  }
}

module.exports = {
  BUILDING_TYPES,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT,
  BUILDING_TYPES_REQUIRING_RESIDENTIAL_DETAILS,
  BUILDING_TYPE_LABELS,
  ROOM_COUNT_FIELDS
}
