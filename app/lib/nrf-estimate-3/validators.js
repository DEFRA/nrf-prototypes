/**
 * Validation functions for NRF Estimate journey
 * Provides consistent validation logic across all routes
 */

function validateEmail(email) {
  if (!email || email.trim() === '') {
    return {
      valid: false,
      error: 'Enter your email address to continue'
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

module.exports = {
  validateEmail
}
