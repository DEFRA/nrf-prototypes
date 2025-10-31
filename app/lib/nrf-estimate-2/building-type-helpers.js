/**
 * Building type helper functions
 * Business logic for handling building types and their requirements
 */

const {
  BUILDING_TYPES,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT
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
 * Checks if dwellinghouse is selected (requires residential details page)
 * Alias for hasResidentialType for semantic clarity
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if residential details needed
 */
function needsResidentialDetails(buildingTypes) {
  return hasResidentialType(buildingTypes)
}

/**
 * Checks if dwellinghouse (residential) building type is selected
 * @param {Array<string>} buildingTypes - Array of selected building types
 * @returns {boolean} True if dwellinghouse is selected
 */
function hasResidentialType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.DWELLINGHOUSE)
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

module.exports = {
  needsRoomCount,
  needsResidentialDetails,
  hasResidentialType,
  hasResidentialInstitutionType,
  hasNonResidentialType,
  getRemovedBuildingTypes,
  getNewlyAddedBuildingTypes,
  normalizeBuildingTypes,
  BUILDING_TYPES
}
