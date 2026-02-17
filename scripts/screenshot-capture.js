#!/usr/bin/env node

/**
 * Prototype Screenshot Capture Script
 *
 * This script walks through a prototype journey and captures screenshots of each page.
 * It uses Puppeteer to automate browser interactions and capture screenshots.
 *
 * Usage: node screenshot-capture.js <prototype-path> [options]
 *
 * Example: node screenshot-capture.js nrf-estimate-1
 */

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3000'
const DEFAULT_SCREENSHOT_DIR = 'screenshots'
const DEFAULT_VIEWPORT = { width: 1200, height: 800 }
const DEFAULT_DELAY = 1000 // 1 second delay between pages

// Prototype journey definitions
const PROTOTYPE_JOURNEYS = {
  'nrf-estimate-1': {
    name: 'NRF Estimate Journey',
    basePath: '/nrf-estimate-1',
    pages: [
      { path: '/start', name: 'start', title: 'Start Page' },
      {
        path: '/what-would-you-like-to-do',
        name: 'what-would-you-like-to-do',
        title: 'What would you like to do?'
      },
      {
        path: '/redline-map',
        name: 'redline-map',
        title: 'Redline Map Question'
      },
      {
        path: '/upload-redline',
        name: 'upload-redline',
        title: 'Upload Redline File'
      },
      { path: '/map', name: 'map', title: 'Draw on Map' },
      { path: '/no-edp', name: 'no-edp', title: 'No EDP Area' },
      {
        path: '/building-type',
        name: 'building-type',
        title: 'Building Type Selection'
      },
      { path: '/room-count', name: 'room-count', title: 'Room Count' },
      {
        path: '/residential',
        name: 'residential',
        title: 'Residential Building Count'
      },
      {
        path: '/non-residential',
        name: 'non-residential',
        title: 'Non-residential Development'
      },
      { path: '/email', name: 'email', title: 'Email Entry' },
      { path: '/summary', name: 'summary', title: 'Summary' },
      { path: '/confirmation', name: 'confirmation', title: 'Confirmation' },
      {
        path: '/estimate-email-content',
        name: 'estimate-email-content',
        title: 'Estimate Email Content'
      },
      {
        path: '/do-you-have-an-estimate-ref',
        name: 'do-you-have-an-estimate-ref',
        title: 'Do you have an estimate reference?'
      },
      {
        path: '/enter-estimate-ref',
        name: 'enter-estimate-ref',
        title: 'Enter Estimate Reference'
      },
      {
        path: '/retrieve-estimate-email',
        name: 'retrieve-estimate-email',
        title: 'Retrieve Estimate Email'
      },
      {
        path: '/estimate-email-retrieval-content',
        name: 'estimate-email-retrieval-content',
        title: 'Estimate Email Retrieval Content'
      },
      {
        path: '/planning-ref',
        name: 'planning-ref',
        title: 'Planning Reference'
      },
      {
        path: '/payment-summary',
        name: 'payment-summary',
        title: 'Payment Summary'
      },
      {
        path: '/payment-confirmation',
        name: 'payment-confirmation',
        title: 'Payment Confirmation'
      },
      {
        path: '/estimate-confirmation-email',
        name: 'estimate-confirmation-email',
        title: 'Estimate Confirmation Email'
      },
      { path: '/payment-email', name: 'payment-email', title: 'Payment Email' }
    ],
    // Form data to fill out during the journey
    formData: {
      'journey-type': 'estimate',
      'has-redline-boundary-file': 'yes',
      'file-name': 'test-boundary.geojson',
      'building-types': ['Dwellinghouse'],
      'residential-building-count': '5',
      email: 'test@example.com'
    }
  },
  'nrf-estimate-2': {
    name: 'NRF Estimate Journey 2',
    basePath: '/nrf-estimate-2',
    pages: [
      // ESTIMATE JOURNEY (Primary flow)
      { path: '/start', name: 'start', title: 'Start Page' },
      {
        path: '/what-would-you-like-to-do',
        name: 'what-would-you-like-to-do',
        title: 'What would you like to do?'
      },
      {
        path: '/redline-map',
        name: 'redline-map',
        title: 'Redline Map Question'
      },
      {
        path: '/upload-redline',
        name: 'upload-redline',
        title: 'Upload Redline File'
      },
      { path: '/map', name: 'map', title: 'Draw on Map' },
      {
        path: '/building-type',
        name: 'building-type',
        title: 'Building Type Selection'
      },
      {
        path: '/residential',
        name: 'residential',
        title: 'Residential Building Count'
      },
      { path: '/email', name: 'email', title: 'Email Entry' },
      { path: '/summary', name: 'summary', title: 'Summary' },
      { path: '/confirmation', name: 'confirmation', title: 'Confirmation' },
      {
        path: '/estimate-email-content',
        name: 'estimate-email-content',
        title: 'Estimate Email Content'
      },
      // Alternative paths in estimate journey
      { path: '/no-edp', name: 'no-edp', title: 'No EDP Area' },
      { path: '/room-count', name: 'room-count', title: 'Room Count' },
      {
        path: '/residential-institution',
        name: 'residential-institution',
        title: 'Residential Institution'
      },
      {
        path: '/non-residential',
        name: 'non-residential',
        title: 'Non-residential Development'
      },
      // PAYMENT JOURNEY (with estimate reference)
      {
        path: '/do-you-have-an-estimate-ref',
        name: 'do-you-have-an-estimate-ref',
        title: 'Do you have an estimate reference?'
      },
      {
        path: '/enter-estimate-ref',
        name: 'enter-estimate-ref',
        title: 'Enter Estimate Reference'
      },
      {
        path: '/retrieve-estimate-email',
        name: 'retrieve-estimate-email',
        title: 'Retrieve Estimate Email'
      },
      {
        path: '/estimate-email-retrieval-content',
        name: 'estimate-email-retrieval-content',
        title: 'Estimate Email Retrieval Content'
      },
      {
        path: '/planning-ref',
        name: 'planning-ref',
        title: 'Planning Reference'
      },
      {
        path: '/payment-summary',
        name: 'payment-summary',
        title: 'Payment Summary'
      },
      {
        path: '/payment-confirmation',
        name: 'payment-confirmation',
        title: 'Payment Confirmation'
      },
      {
        path: '/payment-email',
        name: 'payment-email',
        title: 'Payment Email'
      },
      // INVOICE JOURNEY (Commit to Pay)
      {
        path: '/which',
        name: 'which',
        title: 'Which NRF Levies'
      },
      {
        path: '/confirm',
        name: 'confirm',
        title: 'Confirm Levy Selection'
      },
      {
        path: '/company-details',
        name: 'company-details',
        title: 'Company Details'
      },
      {
        path: '/lpa-email',
        name: 'lpa-email',
        title: 'LPA Email Entry'
      },
      {
        path: '/summary-and-declaration',
        name: 'summary-and-declaration',
        title: 'Summary and Declaration'
      },
      {
        path: '/confirmation',
        name: 'confirmation-invoice',
        title: 'Confirmation (Invoice Journey)'
      },
      {
        path: '/invoice-email-content',
        name: 'invoice-email-content',
        title: 'Invoice Email Content'
      }
    ],
    formData: {
      'journey-type': 'estimate',
      'has-redline-boundary-file': 'yes',
      'file-name': 'test-boundary.geojson',
      'building-types': ['Dwellinghouse'],
      'residential-building-count': '5',
      'room-count': '10',
      'has-estimate-ref': 'yes',
      'estimate-ref': '123456',
      'planning-ref': 'REF123456',
      email: 'test@example.com',
      levies: [
        'Nature Restoration Fund greater crested newts levy: £2,500',
        'Nature Restoration Fund nutrients levy: £2,500'
      ],
      fullName: 'John Smith',
      businessName: 'Test Company Ltd',
      addressLine1: '123 Test Street',
      addressLine2: 'Suite 100',
      townOrCity: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA',
      lpaEmail: 'test@example.com'
    }
  },
  'lpa-approve-1': {
    name: 'LPA Approve Journey',
    basePath: '/lpa-approve-1',
    pages: [
      {
        path: '/lpa-approval-email-content',
        name: 'lpa-approval-email-content',
        title: 'LPA Approval Email Content'
      },
      {
        path: '/confirm-view-approve',
        name: 'confirm-view-approve',
        title: 'Confirm View and Approve'
      },
      {
        path: '/lpa-approval-email-magiclink',
        name: 'lpa-approval-email-magiclink',
        title: 'LPA Approval Email Magic Link'
      },
      {
        path: '/approve-details',
        name: 'approve-details',
        title: 'Approve Details'
      },
      {
        path: '/approval-confirmation',
        name: 'approval-confirmation',
        title: 'Approval Confirmation'
      },
      {
        path: '/lpa-approval-confirmation-email',
        name: 'lpa-approval-confirmation-email',
        title: 'LPA Approval Confirmation Email'
      }
    ],
    formData: {}
  },
  'lpa-approve-3': {
    name: 'LPA Approve Developer Request to Pay NRF (V3)',
    basePath: '/lpa-approve-3',
    pages: [
      {
        path: '/lpa-approval-email-content',
        name: 'lpa-approval-email-content',
        title: 'Email sent from the Nature Restoration Fund service'
      },
      {
        path: '/confirm-view-approve',
        name: 'confirm-view-approve',
        title: 'Confirm view and approve NRF levy details'
      },
      {
        path: '/lpa-approval-email-magiclink',
        name: 'lpa-approval-email-magiclink',
        title: 'Email with magic link'
      },
      {
        path: '/approve-details',
        name: 'approve-details',
        title: 'Approve these details'
      },
      {
        path: '/lpa-details',
        name: 'lpa-details',
        title: 'Enter your details'
      },
      {
        path: '/approval-confirmation',
        name: 'approval-confirmation',
        title: 'Details approved confirmation'
      },
      {
        path: '/lpa-approval-confirmation-email',
        name: 'lpa-approval-confirmation-email',
        title: 'Email approval confirmation'
      },
      {
        path: '/reason-for-rejecting',
        name: 'reason-for-rejecting',
        title: 'Reason for rejecting'
      },
      {
        path: '/reject-confirmation',
        name: 'reject-confirmation',
        title: 'Details rejected confirmation'
      },
      {
        path: '/lpa-rejection-confirmation-email',
        name: 'lpa-rejection-confirmation-email',
        title: 'Email rejection confirmation'
      }
    ],
    formData: {
      'full-name': 'Test LPA User',
      email: 'lpa@example.com',
      'rejection-reason': 'Test reason for rejecting this request.'
    }
  },
  'nrf-estimate-4': {
    name: 'NRF Estimate Journey v4',
    basePath: '/nrf-estimate-4',
    pages: [
      { path: '/start', name: 'start', title: 'Start Page' },
      {
        path: '/what-would-you-like-to-do',
        name: 'what-would-you-like-to-do',
        title: 'What would you like to do?'
      },
      {
        path: '/do-you-have-a-nrf-ref',
        name: 'do-you-have-a-nrf-ref',
        title: 'Do you have an NRF reference?'
      },
      {
        path: '/enter-estimate-ref',
        name: 'enter-estimate-ref',
        title: 'Enter your NRF reference'
      },
      {
        path: '/retrieve-estimate-email',
        name: 'retrieve-estimate-email',
        title: 'Enter your email address'
      },
      {
        path: '/estimate-email-retrieval-content',
        name: 'estimate-email-retrieval-content',
        title: 'Email sent with magic link to estimate'
      },
      {
        path: '/retrieved-estimate-summary',
        name: 'retrieved-estimate-summary',
        title: 'Your quote details'
      },
      {
        path: '/commit-how-would-you-like-to-sign-in',
        name: 'commit-how-would-you-like-to-sign-in',
        title: 'How would you like to sign in?'
      },
      {
        path: '/commit-sign-in-government-gateway',
        name: 'commit-sign-in-government-gateway',
        title: 'Sign in using Government Gateway'
      },
      {
        path: '/company-details',
        name: 'company-details',
        title: 'Enter your details'
      },
      {
        path: '/summary-and-declaration',
        name: 'summary-and-declaration',
        title: 'Check your answers'
      },
      {
        path: '/commit-confirmation',
        name: 'commit-confirmation',
        title: 'Your details have been submitted'
      },
      {
        path: '/commit-email-content',
        name: 'commit-email-content',
        title: 'Email sent from the Nature Restoration Fund service (commit)'
      },
      {
        path: '/pay-how-would-you-like-to-sign-in',
        name: 'pay-how-would-you-like-to-sign-in',
        title: 'How would you like to sign in? (pay)'
      },
      {
        path: '/pay-sign-in-government-gateway',
        name: 'pay-sign-in-government-gateway',
        title: 'Sign in using Government Gateway (pay)'
      },
      {
        path: '/payment-summary',
        name: 'payment-summary',
        title: 'Your commitment details'
      },
      {
        path: '/planning-ref',
        name: 'planning-ref',
        title: 'Enter your planning application reference'
      },
      {
        path: '/payment-declaration',
        name: 'payment-declaration',
        title: 'Check your answers (payment)'
      },
      {
        path: '/payment-confirmation',
        name: 'payment-confirmation',
        title: 'Your details have been submitted (payment)'
      },
      {
        path: '/payment-request-email-content',
        name: 'payment-request-email-content',
        title: 'Payment request approved email'
      },
      {
        path: '/reject-email-content',
        name: 'reject-email-content',
        title: 'Payment request rejected email'
      },
      {
        path: '/pdn-how-would-you-like-to-sign-in',
        name: 'pdn-how-would-you-like-to-sign-in',
        title: 'How would you like to sign in? (PDN)'
      },
      {
        path: '/pdn-sign-in-government-gateway',
        name: 'pdn-sign-in-government-gateway',
        title: 'Sign in using Government Gateway (PDN)'
      },
      {
        path: '/upload-decision-notice',
        name: 'upload-decision-notice',
        title: 'Upload decision notice'
      },
      {
        path: '/decision-notice-confirmation',
        name: 'decision-notice-confirmation',
        title: 'Decision notice confirmation'
      },
      {
        path: '/pay-email-content',
        name: 'pay-email-content',
        title: 'Pay email content'
      },
      { path: '/delete-quote', name: 'delete-quote', title: 'Delete quote' },
      {
        path: '/delete-confirmation',
        name: 'delete-confirmation',
        title: 'Your details have been deleted'
      },
      {
        path: '/delete-summary',
        name: 'delete-summary',
        title: 'Are you sure you want to delete this commitment?'
      },
      {
        path: '/delete-payment-details',
        name: 'delete-payment-details',
        title: 'Are you sure you want to delete these details?'
      },
      {
        path: '/wwtw-entry',
        name: 'wwtw-entry',
        title: 'Enter which waste water treatment works'
      },
      {
        path: '/estimate-email-content',
        name: 'estimate-email-content',
        title: 'Estimate email content'
      },
      {
        path: '/estimate-email-content-range',
        name: 'estimate-email-content-range',
        title: 'Estimate email content (range)'
      },
      {
        path: '/commit-email-content-range',
        name: 'commit-email-content-range',
        title: 'Commit email content (range)'
      }
    ],
    formData: {
      'has-nrf-reference': 'yes',
      'nrf-reference': '123456',
      email: 'test@example.com',
      'sign-in-option': 'government-gateway',
      userId: 'testuser',
      password: 'testpass',
      fullName: 'Test User',
      businessName: 'Test Co',
      addressLine1: '123 Test Street',
      townOrCity: 'London',
      postcode: 'SW1A 1AA',
      'planning-ref': 'PLAN-REF-001',
      'waste-water-treatment-works': 'Great Billing WRC',
      'building-types': ['Housing', 'Other residential'],
      'confirm-delete-quote': 'No',
      'confirm-delete-summary': 'No',
      'confirm-delete-payment-details': 'No'
    }
  }
  // Add more prototypes here as needed
}

class ScreenshotCapture {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL
    this.screenshotDir = options.screenshotDir || DEFAULT_SCREENSHOT_DIR
    this.viewport = options.viewport || DEFAULT_VIEWPORT
    this.delay = options.delay || DEFAULT_DELAY
    this.headless = options.headless !== undefined ? options.headless : false
    this.browser = null
    this.page = null
  }

  async init() {
    console.log('🚀 Starting screenshot capture...')

    // Create screenshot directory
    const fullScreenshotDir = path.join(process.cwd(), this.screenshotDir)
    if (!fs.existsSync(fullScreenshotDir)) {
      fs.mkdirSync(fullScreenshotDir, { recursive: true })
      console.log(`📁 Created screenshot directory: ${fullScreenshotDir}`)
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: this.headless,
      defaultViewport: this.viewport,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    this.page = await this.browser.newPage()
    await this.page.setViewport(this.viewport)

    console.log('🌐 Browser launched successfully')
  }

  async capturePrototype(prototypePath) {
    const journey = PROTOTYPE_JOURNEYS[prototypePath]
    if (!journey) {
      throw new Error(
        `Prototype '${prototypePath}' not found. Available prototypes: ${Object.keys(PROTOTYPE_JOURNEYS).join(', ')}`
      )
    }

    console.log(`📸 Capturing screenshots for: ${journey.name}`)

    const prototypeScreenshotDir = path.join(
      process.cwd(),
      this.screenshotDir,
      prototypePath
    )
    if (!fs.existsSync(prototypeScreenshotDir)) {
      fs.mkdirSync(prototypeScreenshotDir, { recursive: true })
    }

    for (let i = 0; i < journey.pages.length; i++) {
      const pageInfo = journey.pages[i]
      const indexNumber = String(i + 1).padStart(2, '0') // 01, 02, 03, etc.
      try {
        await this.capturePage(
          prototypePath,
          pageInfo,
          prototypeScreenshotDir,
          indexNumber
        )
      } catch (error) {
        console.error(`❌ Failed to capture ${pageInfo.name}:`, error.message)
        // Continue with next page instead of stopping
      }
    }

    console.log(`✅ Screenshot capture completed for ${journey.name}`)
    console.log(`📁 Screenshots saved to: ${prototypeScreenshotDir}`)
  }

  async capturePage(prototypePath, pageInfo, screenshotDir, indexNumber) {
    const journey = PROTOTYPE_JOURNEYS[prototypePath]
    const fullUrl = `${this.baseUrl}${journey.basePath}${pageInfo.path}`
    console.log(`📄 Capturing: ${pageInfo.title} (${fullUrl})`)

    try {
      // Navigate to the page
      await this.page.goto(fullUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, this.delay))

      // Fill out forms if this is a form page
      await this.fillForm(pageInfo, prototypePath)

      // Take screenshot with index number
      const screenshotPath = path.join(
        screenshotDir,
        `${indexNumber}-${pageInfo.name}.png`
      )
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true
      })

      console.log(`✅ Captured: ${indexNumber}-${pageInfo.name}.png`)

      // Submit form if there's a submit button (to save data for next page)
      const submitButton = await this.page.$(
        'button[type="submit"], input[type="submit"], button.govuk-button'
      )
      if (submitButton) {
        await submitButton.click()
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`❌ Error capturing ${pageInfo.name}:`, error.message)
      throw error
    }
  }

  async fillForm(pageInfo, prototypePath) {
    const journey = PROTOTYPE_JOURNEYS[prototypePath]
    const formData = journey.formData || {}

    try {
      // Wait for page to be ready
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Try to fill any text/number/email inputs based on formData
      for (const [fieldName, value] of Object.entries(formData)) {
        // Handle checkboxes (arrays) - check this first before string check
        if (Array.isArray(value)) {
          for (const val of value) {
            const checkbox = await this.page.$(
              `input[type="checkbox"][name="${fieldName}"][value="${val}"]`
            )
            if (checkbox) {
              await checkbox.click()
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          }
          continue // Skip to next field
        }

        // Handle text/email/number inputs
        if (typeof value === 'string' || typeof value === 'number') {
          // Try to find the input - check multiple possible selectors
          let input = await this.page.$(
            `input[name="${fieldName}"][type="text"]`
          )
          if (!input) {
            input = await this.page.$(
              `input[name="${fieldName}"][type="email"]`
            )
          }
          if (!input) {
            input = await this.page.$(
              `input[name="${fieldName}"][type="number"]`
            )
          }
          if (!input) {
            // Try without type attribute
            input = await this.page.$(
              `input[name="${fieldName}"]:not([type="radio"]):not([type="checkbox"])`
            )
          }

          if (input) {
            await input.type(String(value))
            continue // Skip to next field
          }

          // Handle radio buttons
          const radio = await this.page.$(
            `input[type="radio"][name="${fieldName}"][value="${value}"]`
          )
          if (radio) {
            await radio.click()
          }
        }
      }

      // Wait for any UI updates
      await new Promise((resolve) => setTimeout(resolve, 300))
    } catch (error) {
      console.warn(
        `⚠️  Could not fill form for ${pageInfo.name}:`,
        error.message
      )
      // Don't throw error, just continue
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      console.log('🔒 Browser closed')
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: node screenshot-capture.js <prototype-path> [options]')
    console.log('')
    console.log('Available prototypes:')
    Object.keys(PROTOTYPE_JOURNEYS).forEach((key) => {
      console.log(`  - ${key}: ${PROTOTYPE_JOURNEYS[key].name}`)
    })
    console.log('')
    console.log('Options:')
    console.log(
      '  --base-url <url>     Base URL for the prototype (default: http://localhost:3000)'
    )
    console.log(
      '  --screenshot-dir <dir> Screenshot directory (default: screenshots)'
    )
    console.log('  --headless          Run in headless mode')
    console.log(
      '  --delay <ms>        Delay between pages in milliseconds (default: 1000)'
    )
    process.exit(1)
  }

  const prototypePath = args[0]
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    screenshotDir: DEFAULT_SCREENSHOT_DIR,
    headless: false,
    delay: DEFAULT_DELAY
  }

  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--base-url':
        options.baseUrl = args[++i]
        break
      case '--screenshot-dir':
        options.screenshotDir = args[++i]
        break
      case '--headless':
        options.headless = true
        break
      case '--delay':
        options.delay = parseInt(args[++i])
        break
    }
  }

  const capture = new ScreenshotCapture(options)

  try {
    await capture.init()
    await capture.capturePrototype(prototypePath)
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message)
    process.exit(1)
  } finally {
    await capture.close()
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = ScreenshotCapture
