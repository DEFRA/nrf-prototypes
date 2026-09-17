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

## Tests must not hard-code journey copy

The content designer rewords pages in `content/` without running the tests, so a test that spells out a heading, an error message or an option label breaks on every reword. Instead, the specs for the content-driven journeys (`nrf-quote-7`, `nrf-request-to-use-1`) read the copy from the content files through `tests/e2e/helpers/journey.js`:

```js
const { copyOf } = require('./helpers/journey')
const { answer, fillAnswer, fillField, submit, expectHeading, expectError } =
  copyOf('nrf-request-to-use-1')

await answer(page, 'defra-account-user-type', 'agent') // an option by its value
await fillField(page, 'your-address', 'postcode', 'LP1 7RF') // a form field by name
await submit(page, 'your-address') // the page's own button text
await expectHeading(page, 'check-your-answers')
await expectError(page, 'agreement') // the page's `required` error
```

Pages are named by id, options by their `value` and form fields by their `name`: the identifiers the journey's logic already depends on. `followLink(page, id, target)` finds a body link by where it goes, `followResearchLink(page, id, target)` opens a footer user research link's page by where it goes, `changeLink(page, id, target)` a summary row's Change link by the page it changes, and `expectBodyCopy(page, id, phrase)` keeps a prose assertion literal but fails naming the content file when the phrase is gone. `tests/e2e/helpers/request-to-use.js` holds the walkthroughs the request-to-use specs share.

Literals are fine for design-system chrome (`Continue`, `Back`, `Sign out`, `There is a problem`) and for fixture data (`NRL-000001`, `ACME LTD`). `tests/e2e/test-conventions.spec.js` scans the specs and fails on the idioms that used to break: a heading or error summary asserted against a literal string, and `getByLabel(/regex/)`. End a statement with `// copy-ok` if it really must keep one.

Branching options carry an explicit `value:` in their page file, and the loader refuses a `journey.yaml` that compares an answer with a value none of the page's options can store (see `content/README.md`), so a reword can no longer send the journey the wrong way either.

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
