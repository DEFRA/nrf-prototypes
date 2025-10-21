//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here

// Format currency
addFilter('formatCurrency', (value) => {
  if (typeof value !== 'number') return value
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(value)
})

// Format number with commas
addFilter('formatNumber', (value) => {
  if (typeof value !== 'number') return value
  return new Intl.NumberFormat('en-GB').format(value)
})

// Format date
addFilter('formatDate', (value) => {
  if (!value) return value
  const date = new Date(value)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
})

// Round number
addFilter('round', (value, decimals = 0) => {
  if (typeof value !== 'number') return value
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals)
})

// Format time
addFilter('formatTime', (value) => {
  if (!value) return value
  const date = new Date(value)
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Title case
addFilter('title', (value) => {
  if (!value) return value
  return value.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
})

// Replace underscores with spaces
addFilter('replace', (value, search, replacement) => {
  if (!value) return value
  return value.replace(new RegExp(search, 'g'), replacement)
})

// Stringify for JSON output
addFilter('stringify', (value) => {
  if (!value) return 'null'
  try {
    return JSON.stringify(value)
  } catch (error) {
    console.error('Error stringifying value:', error, value)
    return 'null'
  }
})
