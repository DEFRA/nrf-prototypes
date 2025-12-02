# E2E Testing with Playwright

Smoke tests for the NRF Prototypes application to catch critical errors before deployment.

## What These Tests Do

These tests catch:

- Module not found errors (e.g., missing dependencies like `@turf/turf`)
- Journey start page failures
- Missing or broken imports

## Running Tests

### Quick Start

1. **Start the app** in one terminal:

   ```bash
   npm run dev
   ```

2. **Run tests** in another terminal:

   ```bash
   npm run test:e2e
   ```

### Test Commands

- `npm run test:e2e` - Run all tests (headless)
- `npm run test:e2e:headed` - Run with visible browser
- `npm run test:e2e:ui` - Open interactive test runner
- `npm run test:e2e:debug` - Run with debugger

## What's Tested

**Current smoke tests:**

1. Homepage loads without errors
2. Journey start pages load (automatically sourced from `app/config/shared/journeys.js`)

The tests dynamically load journey configurations, so adding a new journey to `app/config/shared/journeys.js` automatically includes it in tests.

## Debugging Failed Tests

**See what's happening:**

```bash
npm run test:e2e:headed
```

**Check screenshots:** Failed tests save screenshots to `test-results/`

**View HTML report:**

```bash
npx playwright show-report
```

## Configuration

Configuration in [`playwright.config.js`](../playwright.config.js):

- Base URL: `http://localhost:3000`
- Timeout: 30 seconds per test
- Browser: Chromium only
- Workers: 1 (prototype kit limitation)

## Common Issues

**Port 3000 in use:** Stop existing app instances

**Tests timeout:** Ensure app is running at http://localhost:3000

**Browser not found:** Run `npx playwright install chromium`

## Resources

- [Playwright Docs](https://playwright.dev)
- [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/)
