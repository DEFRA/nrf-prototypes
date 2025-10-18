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

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_SCREENSHOT_DIR = 'screenshots';
const DEFAULT_VIEWPORT = { width: 1200, height: 800 };
const DEFAULT_DELAY = 1000; // 1 second delay between pages

// Prototype journey definitions
const PROTOTYPE_JOURNEYS = {
    'nrf-estimate-1': {
        name: 'NRF Estimate Journey',
        basePath: '/nrf-estimate-1',
        pages: [
            { path: '/start', name: 'start', title: 'Start Page' },
            { path: '/what-would-you-like-to-do', name: 'what-would-you-like-to-do', title: 'What would you like to do?' },
            { path: '/redline-map', name: 'redline-map', title: 'Redline Map Question' },
            { path: '/upload-redline', name: 'upload-redline', title: 'Upload Redline File' },
            { path: '/map', name: 'map', title: 'Draw on Map' },
            { path: '/no-edp', name: 'no-edp', title: 'No EDP Area' },
            { path: '/building-type', name: 'building-type', title: 'Building Type Selection' },
            { path: '/room-count', name: 'room-count', title: 'Room Count' },
            { path: '/residential', name: 'residential', title: 'Residential Building Count' },
            { path: '/non-residential', name: 'non-residential', title: 'Non-residential Development' },
            { path: '/email', name: 'email', title: 'Email Entry' },
            { path: '/summary', name: 'summary', title: 'Summary' },
            { path: '/confirmation', name: 'confirmation', title: 'Confirmation' },
            { path: '/estimate-email-content', name: 'estimate-email-content', title: 'Estimate Email Content' },
            { path: '/do-you-have-an-estimate-ref', name: 'do-you-have-an-estimate-ref', title: 'Do you have an estimate reference?' },
            { path: '/enter-estimate-ref', name: 'enter-estimate-ref', title: 'Enter Estimate Reference' },
            { path: '/retrieve-estimate-email', name: 'retrieve-estimate-email', title: 'Retrieve Estimate Email' },
            { path: '/estimate-email-retrieval-content', name: 'estimate-email-retrieval-content', title: 'Estimate Email Retrieval Content' },
            { path: '/planning-ref', name: 'planning-ref', title: 'Planning Reference' },
            { path: '/payment-summary', name: 'payment-summary', title: 'Payment Summary' },
            { path: '/payment-confirmation', name: 'payment-confirmation', title: 'Payment Confirmation' },
            { path: '/estimate-confirmation-email', name: 'estimate-confirmation-email', title: 'Estimate Confirmation Email' },
            { path: '/payment-email', name: 'payment-email', title: 'Payment Email' }
        ],
        // Form data to fill out during the journey
        formData: {
            'journey-type': 'estimate',
            'has-redline-boundary-file': 'yes',
            'file-name': 'test-boundary.geojson',
            'building-types': ['Dwellinghouse'],
            'residential-building-count': '5',
            'email': 'test@example.com'
        }
    }
    // Add more prototypes here as needed
};

class ScreenshotCapture {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
        this.screenshotDir = options.screenshotDir || DEFAULT_SCREENSHOT_DIR;
        this.viewport = options.viewport || DEFAULT_VIEWPORT;
        this.delay = options.delay || DEFAULT_DELAY;
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🚀 Starting screenshot capture...');
        
        // Create screenshot directory
        const fullScreenshotDir = path.join(process.cwd(), this.screenshotDir);
        if (!fs.existsSync(fullScreenshotDir)) {
            fs.mkdirSync(fullScreenshotDir, { recursive: true });
            console.log(`📁 Created screenshot directory: ${fullScreenshotDir}`);
        }

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for headless mode
            defaultViewport: this.viewport,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport(this.viewport);
        
        console.log('🌐 Browser launched successfully');
    }

    async capturePrototype(prototypePath) {
        const journey = PROTOTYPE_JOURNEYS[prototypePath];
        if (!journey) {
            throw new Error(`Prototype '${prototypePath}' not found. Available prototypes: ${Object.keys(PROTOTYPE_JOURNEYS).join(', ')}`);
        }

        console.log(`📸 Capturing screenshots for: ${journey.name}`);
        
        const prototypeScreenshotDir = path.join(process.cwd(), this.screenshotDir, prototypePath);
        if (!fs.existsSync(prototypeScreenshotDir)) {
            fs.mkdirSync(prototypeScreenshotDir, { recursive: true });
        }

        for (let i = 0; i < journey.pages.length; i++) {
            const pageInfo = journey.pages[i];
            const indexNumber = String(i + 1).padStart(2, '0'); // 01, 02, 03, etc.
            try {
                await this.capturePage(prototypePath, pageInfo, prototypeScreenshotDir, indexNumber);
            } catch (error) {
                console.error(`❌ Failed to capture ${pageInfo.name}:`, error.message);
                // Continue with next page instead of stopping
            }
        }

        console.log(`✅ Screenshot capture completed for ${journey.name}`);
        console.log(`📁 Screenshots saved to: ${prototypeScreenshotDir}`);
    }

    async capturePage(prototypePath, pageInfo, screenshotDir, indexNumber) {
        const journey = PROTOTYPE_JOURNEYS[prototypePath];
        const fullUrl = `${this.baseUrl}${journey.basePath}${pageInfo.path}`;
        console.log(`📄 Capturing: ${pageInfo.title} (${fullUrl})`);

        try {
            // Navigate to the page
            await this.page.goto(fullUrl, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });

            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, this.delay));

            // Fill out forms if this is a form page
            await this.fillForm(pageInfo, prototypePath);

            // Take screenshot with index number
            const screenshotPath = path.join(screenshotDir, `${indexNumber}-${pageInfo.name}.png`);
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });

            console.log(`✅ Captured: ${indexNumber}-${pageInfo.name}.png`);

        } catch (error) {
            console.error(`❌ Error capturing ${pageInfo.name}:`, error.message);
            throw error;
        }
    }

    async fillForm(pageInfo, prototypePath) {
        const journey = PROTOTYPE_JOURNEYS[prototypePath];
        const formData = journey.formData || {};

        try {
            // Fill out specific forms based on page
            switch (pageInfo.name) {
                case 'what-would-you-like-to-do':
                    await this.page.select('input[name="journey-type"][value="estimate"]');
                    break;
                
                case 'redline-map':
                    await this.page.click('input[name="has-redline-boundary-file"][value="yes"]');
                    break;
                
                case 'upload-redline':
                    await this.page.type('input[name="file-name"]', formData['file-name'] || 'test-boundary.geojson');
                    break;
                
                case 'building-type':
                    await this.page.click('input[name="building-types"][value="Dwellinghouse"]');
                    break;
                
                case 'residential':
                    await this.page.type('input[name="residential-building-count"]', formData['residential-building-count'] || '5');
                    break;
                
                case 'email':
                    await this.page.type('input[name="email"]', formData['email'] || 'test@example.com');
                    break;
                
                case 'do-you-have-an-estimate-ref':
                    await this.page.click('input[name="has-estimate-ref"][value="yes"]');
                    break;
                
                case 'enter-estimate-ref':
                    await this.page.type('input[name="estimate-ref"]', '123456');
                    break;
                
                case 'retrieve-estimate-email':
                    await this.page.type('input[name="email"]', formData['email'] || 'test@example.com');
                    break;
                
                case 'planning-ref':
                    await this.page.type('input[name="planning-ref"]', 'PL/2024/001234');
                    break;
            }

            // Submit form if it's a form page (not a display-only page)
            const displayOnlyPages = ['start', 'summary', 'confirmation', 'no-edp', 'estimate-email-content', 
                                   'estimate-email-retrieval-content', 'payment-summary', 'payment-confirmation',
                                   'estimate-confirmation-email', 'payment-email'];
            
            if (!displayOnlyPages.includes(pageInfo.name)) {
                const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
                if (submitButton) {
                    await submitButton.click();
                    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for navigation
                }
            }

        } catch (error) {
            console.warn(`⚠️  Could not fill form for ${pageInfo.name}:`, error.message);
            // Don't throw error, just continue
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node screenshot-capture.js <prototype-path> [options]');
        console.log('');
        console.log('Available prototypes:');
        Object.keys(PROTOTYPE_JOURNEYS).forEach(key => {
            console.log(`  - ${key}: ${PROTOTYPE_JOURNEYS[key].name}`);
        });
        console.log('');
        console.log('Options:');
        console.log('  --base-url <url>     Base URL for the prototype (default: http://localhost:3000)');
        console.log('  --screenshot-dir <dir> Screenshot directory (default: screenshots)');
        console.log('  --headless          Run in headless mode');
        console.log('  --delay <ms>        Delay between pages in milliseconds (default: 1000)');
        process.exit(1);
    }

    const prototypePath = args[0];
    const options = {
        baseUrl: DEFAULT_BASE_URL,
        screenshotDir: DEFAULT_SCREENSHOT_DIR,
        headless: false,
        delay: DEFAULT_DELAY
    };

    // Parse command line options
    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--base-url':
                options.baseUrl = args[++i];
                break;
            case '--screenshot-dir':
                options.screenshotDir = args[++i];
                break;
            case '--headless':
                options.headless = true;
                break;
            case '--delay':
                options.delay = parseInt(args[++i]);
                break;
        }
    }

    const capture = new ScreenshotCapture(options);
    
    try {
        await capture.init();
        await capture.capturePrototype(prototypePath);
    } catch (error) {
        console.error('❌ Screenshot capture failed:', error.message);
        process.exit(1);
    } finally {
        await capture.close();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ScreenshotCapture;
