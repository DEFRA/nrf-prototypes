// Applications functionality
// This file contains JavaScript functions specific to the applications journey

// Application management utilities
const ApplicationManager = {
  // Store application data in session
  storeApplicationData: function (data) {
    sessionStorage.setItem('currentApplication', JSON.stringify(data))
  },

  // Get current application data
  getCurrentApplication: function () {
    const data = sessionStorage.getItem('currentApplication')
    return data ? JSON.parse(data) : null
  },

  // Clear current application data
  clearCurrentApplication: function () {
    sessionStorage.removeItem('currentApplication')
  },

  // Store application step
  setApplicationStep: function (step) {
    sessionStorage.setItem('applicationStep', step)
  },

  // Get current application step
  getApplicationStep: function () {
    return sessionStorage.getItem('applicationStep') || 'start'
  }
}

// Quote calculation utilities
const QuoteCalculator = {
  // Calculate quote based on EDPs and development data
  calculateQuote: function (applicableEDPs, developmentData) {
    const breakdown = []
    let total = 0

    applicableEDPs.forEach((edp) => {
      const amount = developmentData.houseCount * edp.rate
      breakdown.push({
        edpType: edp.type,
        description: edp.name,
        rate: edp.rate,
        houseCount: developmentData.houseCount,
        amount: amount
      })
      total += amount
    })

    return {
      total: total,
      breakdown: breakdown
    }
  },

  // Format currency for display
  formatCurrency: function (amount) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }
}

// Form validation utilities
const ApplicationValidation = {
  // Validate development name
  isValidDevelopmentName: function (name) {
    return name && name.trim().length > 0 && name.trim().length <= 100
  },

  // Validate house count
  isValidHouseCount: function (count) {
    return !isNaN(count) && count > 0 && count <= 10000
  },

  // Validate location data
  isValidLocation: function (location) {
    return (
      location &&
      ((location.center && location.center.length === 2) ||
        (location.boundary && location.boundary.coordinates))
    )
  },

  // Validate EDP data
  isValidEDPs: function (edps) {
    return Array.isArray(edps) && edps.length > 0
  },

  // Validate wastewater treatment site selection
  isValidWastewaterSite: function (site, hasNutrientMitigation) {
    if (!hasNutrientMitigation) return true
    return site && site.trim().length > 0
  },

  // Validate pond boundaries (for DLL)
  isValidPondBoundaries: function (boundaries, hasDLL) {
    if (!hasDLL) return true
    return boundaries && boundaries.coordinates
  }
}

// UI utilities for applications
const ApplicationUI = {
  // Show application progress
  showProgress: function (currentStep) {
    const steps = ['start', 'location', 'data', 'summary', 'payment']
    const currentIndex = steps.indexOf(currentStep)

    // Update progress indicators
    steps.forEach((step, index) => {
      const element = document.querySelector(`[data-step="${step}"]`)
      if (element) {
        if (index < currentIndex) {
          element.classList.add('govuk-tag--green')
          element.textContent = '✓ ' + element.textContent.replace('✓ ', '')
        } else if (index === currentIndex) {
          element.classList.add('govuk-tag--blue')
        } else {
          element.classList.remove('govuk-tag--green', 'govuk-tag--blue')
        }
      }
    })
  },

  // Show loading state
  showLoading: function (button, text = 'Loading...') {
    const originalText = button.textContent
    button.textContent = text
    button.disabled = true
    return originalText
  },

  // Hide loading state
  hideLoading: function (button, originalText) {
    button.textContent = originalText
    button.disabled = false
  },

  // Show success message
  showSuccess: function (message, targetId = null) {
    const successDiv = document.createElement('div')
    successDiv.className = 'govuk-inset-text'
    successDiv.innerHTML = `<p class="govuk-body">${message}</p>`

    const target = targetId
      ? document.getElementById(targetId)
      : document.querySelector('.govuk-grid-column-two-thirds')
    if (target) {
      target.insertBefore(successDiv, target.firstChild)
    }
  },

  // Show error message
  showError: function (message, targetId = null) {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'govuk-error-summary'
    errorDiv.setAttribute('aria-labelledby', 'error-summary-title')
    errorDiv.setAttribute('role', 'alert')
    errorDiv.setAttribute('tabindex', '-1')
    errorDiv.innerHTML = `
            <h2 class="govuk-error-summary__title" id="error-summary-title">
                There is a problem
            </h2>
            <div class="govuk-error-summary__body">
                <ul class="govuk-list govuk-error-summary__list">
                    <li><a href="${targetId ? '#' + targetId : '#'}">${message}</a></li>
                </ul>
            </div>
        `

    const target = targetId
      ? document.getElementById(targetId)
      : document.querySelector('.govuk-grid-column-two-thirds')
    if (target) {
      target.insertBefore(errorDiv, target.firstChild)
    }
  },

  // Hide error message
  hideError: function () {
    const errorDiv = document.querySelector('.govuk-error-summary')
    if (errorDiv) {
      errorDiv.remove()
    }
  },

  // Update application status badge
  updateStatusBadge: function (status) {
    const badges = document.querySelectorAll('.govuk-tag')
    badges.forEach((badge) => {
      if (badge.textContent.includes('Application status')) {
        badge.className = 'govuk-tag'
        switch (status) {
          case 'draft':
            badge.classList.add('govuk-tag--grey')
            badge.textContent = 'Draft'
            break
          case 'pending_payment':
            badge.classList.add('govuk-tag--orange')
            badge.textContent = 'Pending Payment'
            break
          case 'paid':
            badge.classList.add('govuk-tag--green')
            badge.textContent = 'Paid'
            break
          case 'approved':
            badge.classList.add('govuk-tag--blue')
            badge.textContent = 'Approved'
            break
        }
      }
    })
  }
}

// Payment utilities
const PaymentManager = {
  // Mock payment processing
  processPayment: function (amount, applicationId) {
    return new Promise((resolve, reject) => {
      // Simulate payment processing
      setTimeout(() => {
        const success = Math.random() > 0.1 // 90% success rate
        if (success) {
          resolve({
            success: true,
            paymentReference: 'PAY-' + Date.now(),
            amount: amount,
            applicationId: applicationId
          })
        } else {
          reject(new Error('Payment failed'))
        }
      }, 2000)
    })
  },

  // Format payment amount
  formatPaymentAmount: function (amount) {
    return QuoteCalculator.formatCurrency(amount)
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ApplicationManager,
    QuoteCalculator,
    ApplicationValidation,
    ApplicationUI,
    PaymentManager
  }
}
