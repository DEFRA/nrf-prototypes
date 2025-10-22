/**
 * Validation functions for NRF Estimate journey
 * Provides consistent validation logic across all routes
 */

/**
 * Validates an email address
 * @param {string} email - Email address to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateEmail(email) {
  if (!email || email.trim() === '') {
    return {
      valid: false,
      error: 'Enter an email address'
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error:
        'Enter an email address in the correct format, like name@example.com'
    }
  }

  return { valid: true }
}

/**
 * Validates a room count value
 * @param {string|number} count - Room count to validate
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateRoomCount(count, fieldName = 'room count') {
  if (!count || count === '') {
    return {
      valid: false,
      error: `Enter the ${fieldName}`
    }
  }

  const numericValue = Number(count)
  if (isNaN(numericValue) || !Number.isInteger(numericValue)) {
    return {
      valid: false,
      error: `The ${fieldName} must be a whole number`
    }
  }

  if (numericValue < 0) {
    return {
      valid: false,
      error: `The ${fieldName} must be 0 or more`
    }
  }

  return { valid: true }
}

/**
 * Validates a planning reference
 * @param {string} planningRef - Planning reference to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validatePlanningRef(planningRef) {
  if (!planningRef || planningRef.trim() === '') {
    return {
      valid: false,
      error: 'Enter a planning reference number'
    }
  }

  return { valid: true }
}

/**
 * Validates estimate reference number
 * @param {string} estimateRef - Estimate reference to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateEstimateRef(estimateRef) {
  if (!estimateRef || estimateRef.trim() === '') {
    return {
      valid: false,
      error: 'Enter an estimate reference number'
    }
  }

  return { valid: true }
}

/**
 * Validates boundary data (GeoJSON)
 * @param {Object} boundaryData - Boundary data to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateBoundaryData(boundaryData) {
  if (!boundaryData) {
    return {
      valid: false,
      error: 'No boundary data provided'
    }
  }

  if (!boundaryData.type || !boundaryData.features) {
    return {
      valid: false,
      error: 'Invalid boundary data format'
    }
  }

  if (
    !Array.isArray(boundaryData.features) ||
    boundaryData.features.length === 0
  ) {
    return {
      valid: false,
      error: 'Boundary data must contain at least one feature'
    }
  }

  return { valid: true }
}

/**
 * Validates that required field is not empty
 * @param {string} value - Value to check
 * @param {string} fieldName - Name of the field for error message
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return {
      valid: false,
      error: `${fieldName} is required`
    }
  }

  return { valid: true }
}

/**
 * Validates that at least one checkbox option is selected
 * @param {Array|string} selectedValues - Selected values
 * @param {string} fieldName - Name of the field for error message
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validateCheckboxSelection(selectedValues, fieldName) {
  if (
    !selectedValues ||
    (Array.isArray(selectedValues) && selectedValues.length === 0) ||
    (typeof selectedValues === 'string' && selectedValues.trim() === '')
  ) {
    return {
      valid: false,
      error: `Select at least one ${fieldName}`
    }
  }

  return { valid: true }
}

module.exports = {
  validateEmail,
  validateRoomCount,
  validatePlanningRef,
  validateEstimateRef,
  validateBoundaryData,
  validateRequired,
  validateCheckboxSelection
}
