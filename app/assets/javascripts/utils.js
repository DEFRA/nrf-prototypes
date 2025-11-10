/**
 * Common utility functions
 */

;(function (window) {
  'use strict'

  // Cookie utilities
  const CookieUtils = {
    /**
     * Set a cookie with an expiration date
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} days - Number of days until expiration
     */
    set: function (name, value, days) {
      const expires = new Date()
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
      document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
    },

    /**
     * Get a cookie value by name
     * @param {string} name - Cookie name
     * @returns {string|null} Cookie value or null if not found
     */
    get: function (name) {
      const nameEQ = name + '='
      const ca = document.cookie.split(';')
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') c = c.substring(1, c.length)
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
      }
      return null
    },

    /**
     * Delete a cookie by name
     * @param {string} name - Cookie name
     */
    delete: function (name) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
    }
  }

  // Export to window
  window.CookieUtils = CookieUtils
})(window)
