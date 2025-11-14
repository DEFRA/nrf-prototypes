/**
 * Building type helper functions
 * Business logic for handling building types and their requirements
 */

const {
  BUILDING_TYPES,
  BUILDING_TYPES_REQUIRING_ROOM_COUNT
} = require('../../config/shared/building-types')

function needsRoomCount(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.some((type) =>
    BUILDING_TYPES_REQUIRING_ROOM_COUNT.includes(type)
  )
}

function needsResidentialDetails(buildingTypes) {
  return hasResidentialType(buildingTypes)
}

function hasResidentialType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.DWELLINGHOUSE)
}

function hasResidentialInstitutionType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.RESIDENTIAL_INSTITUTION)
}

function hasNonResidentialType(buildingTypes) {
  if (!buildingTypes || !Array.isArray(buildingTypes)) {
    return false
  }

  return buildingTypes.includes(BUILDING_TYPES.NON_RESIDENTIAL)
}

function getRemovedBuildingTypes(previousTypes, currentTypes) {
  if (!previousTypes || !Array.isArray(previousTypes)) {
    return []
  }

  const current = currentTypes || []
  return previousTypes.filter((type) => !current.includes(type))
}

function getNewlyAddedBuildingTypes(previousTypes, currentTypes) {
  if (!currentTypes || !Array.isArray(currentTypes)) {
    return []
  }

  const previous = previousTypes || []
  return currentTypes.filter((type) => !previous.includes(type))
}

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
