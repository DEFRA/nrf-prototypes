/**
 * Building type helper functions
 * Business logic for handling building types and their requirements
 */

const {
  BUILDING_TYPES,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT,
  BUILDING_TYPES_REQUIRING_RESIDENTIAL_COUNT,
  BUILDING_TYPES_REQUIRING_RESIDENTIAL_INSTITUTION_COUNT
} = require('../../config/nrf-estimate-1/building-types')

/**
 * Checks if any of the selected building types require room count input
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if room count is needed
 */
function needsRoomCount(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.some((type) =>
    BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
  )
}

/**
 * Checks if any of the selected building types require residential count
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if residential count is needed
 */
function needsResidentialCount(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.some((type) =>
    BUILDING_TYPES_REQUIRING_RESIDENTIAL_COUNT.includes(type)
  )
}

/**
 * Checks if any of the selected building types require residential institution count
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if residential institution count is needed
 */
function needsResidentialInstitutionCount(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.some((type) =>
    BUILDING_TYPES_REQUIRING_RESIDENTIAL_INSTITUTION_COUNT.includes(type)
  )
}

/**
 * Checks if residential building type is selected
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if residential is selected
 */
function hasResidentialType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.RESIDENTIAL)
}

/**
 * Checks if residential institution building type is selected
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if residential institution is selected
 */
function hasResidentialInstitutionType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.RESIDENTIAL_INSTITUTION)
}

/**
 * Checks if non-residential building type is selected
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if non-residential is selected
 */
function hasNonResidentialType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.NON_RESIDENTIAL)
}

/**
 * Gets building types that were removed (present in previous but not in current)
 * @param {Array<string>} previousTypes - Previously selected building types
 * @param {Array<string>} currentTypes - Currently selected building types
 * @returns {Array<string>} Array of removed building types
 */
function getRemovedBuildingTypes(previousTypes, currentTypes) {
  if (!previousTypes || !Array.isArray(previousTypes)) {
    return []
  }

  const current = currentTypes || []
  return previousTypes.filter((type) => !current.includes(type))
}

/**
 * Gets building types that were newly added (present in current but not in previous)
 * @param {Array<string>} previousTypes - Previously selected building types
 * @param {Array<string>} currentTypes - Currently selected building types
 * @returns {Array<string>} Array of newly added building types
 */
function getNewlyAddedBuildingTypes(previousTypes, currentTypes) {
  if (!currentTypes || !Array.isArray(currentTypes)) {
    return []
  }

  const previous = previousTypes || []
  return currentTypes.filter((type) => !previous.includes(type))
}

/**
 * Normalizes building types input to always be an array
 * @param {string|Array<string>} buildingTypes - Building types input
 * @returns {Array<string>} Normalized array of building types
 */
function normalizeBuildingTypes(buildingTypes) {
  if (!buildingTypes) {
    return []
  }

  if (Array.isArray(buildingTypes)) {
    return buildingTypes
  }

  return [buildingTypes]
}

/**
 * Cleans room count data for removed building types
 * @param {Object} roomCounts - Current room count data
 * @param {Array<string>} removedTypes - Building types that were removed
 * @returns {Object} Cleaned room count data
 */
function cleanRoomCountsForRemovedTypes(roomCounts, removedTypes) {
  if (!roomCounts || !removedTypes || removedTypes.length === 0) {
    return roomCounts
  }

  const cleaned = { ...roomCounts }

  removedTypes.forEach((type) => {
    if (type === BUILDING_TYPES.RESIDENTIAL) {
      delete cleaned.bedrooms
      delete cleaned.bathrooms
      delete cleaned.otherRooms
    } else if (type === BUILDING_TYPES.RESIDENTIAL_INSTITUTION) {
      delete cleaned.residentialUnits
    } else if (type === BUILDING_TYPES.NON_RESIDENTIAL) {
      delete cleaned.rooms
    }
  })

  return cleaned
}

/**
 * Checks if all required room counts are provided for selected building types
 * @param {Object} roomCounts - Room count data
 * @param {Array<string>} buildingTypes - Selected building types
 * @returns {boolean} True if all required counts are present
 */
function hasAllRequiredRoomCounts(roomCounts, buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return true
  }

  if (!roomCounts) {
    return false
  }

  for (const type of buildingTypes) {
    if (type === BUILDING_TYPES.RESIDENTIAL) {
      if (
        !roomCounts.bedrooms ||
        !roomCounts.bathrooms ||
        !roomCounts.otherRooms
      ) {
        return false
      }
    } else if (type === BUILDING_TYPES.RESIDENTIAL_INSTITUTION) {
      if (!roomCounts.residentialUnits) {
        return false
      }
    } else if (type === BUILDING_TYPES.NON_RESIDENTIAL) {
      if (!roomCounts.rooms) {
        return false
      }
    }
  }

  return true
}

module.exports = {
  needsRoomCount,
  needsResidentialCount,
  needsResidentialInstitutionCount,
  hasResidentialType,
  hasResidentialInstitutionType,
  hasNonResidentialType,
  getRemovedBuildingTypes,
  getNewlyAddedBuildingTypes,
  normalizeBuildingTypes,
  cleanRoomCountsForRemovedTypes,
  hasAllRequiredRoomCounts,
  BUILDING_TYPES
}
