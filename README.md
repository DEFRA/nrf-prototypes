# nrf-prototypes

`Node.js` prototype template, using the [GOV.UK Prototype Kit](https://github.com/alphagov/govuk-prototype-kit) and
the [GOV.UK Frontend](https://github.com/alphagov/govuk-frontend).

> Basically the `GOV.UK Prototype Kit` and `GOV.UK Frontend` wrapped up and provided on the Core Delivery Platform

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [GOV.UK Prototype Kit and GOV.UK Frontend](#govuk-prototype-kit-and-govuk-frontend)
- [Using the refreshed GOV.UK brand](#using-the-refreshed-govuk-brand)
- [Setting a password](#setting-a-password)
- [Setting multiple passwords](#setting-multiple-passwords)
- [Removing the need for a password](#removing-the-need-for-a-password)
- [Map and Vector Tiles](#map-and-vector-tiles)
  - [Running with maps](#running-with-maps)
  - [Vector Tile Conversion](#vector-tile-conversion)
  - [Production map component](#production-map-component)
  - [How it works](#how-it-works)
- [Npm scripts](#npm-scripts)
- [Updating dependencies](#updating-dependencies)
- [Environment Variables and Secrets](#environment-variables-and-secrets)
  - [Local development](#local-development)
  - [Environment Variables on CDP](#environment-variables-on-cdp)
  - [Environment Variables in the GOV.UK Prototype Kit](#environment-variables-in-the-govuk-prototype-kit)
  - [Secrets](#secrets)
- [Creating a secret](#creating-a-secret)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Debug docker](#debug-docker)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v11`. You will find it easier to use
the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd nrf-prototypes
nvm use
```

## GOV.UK Prototype Kit and GOV.UK Frontend

The [GOV.UK Prototype Kit](https://github.com/alphagov/govuk-prototype-kit) is a tool for building interactive
prototypes that look like pages on GOV.UK, it provides components and styles from the
[GOV.UK Frontend](https://github.com/alphagov/govuk-frontend). Both are provided by the
[Government Digital Service (GDS)](https://www.gov.uk/government/organisations/government-digital-service), this
template provides both tools in a wrapper that runs on the Core Delivery Platform at Defra.

> [!NOTE]
> The `GOV.UK Prototype Kit` is built with [express.js](https://expressjs.com/). The `Node.js`
> applications [cdp-node-frontend-template](https://github.com/DEFRA/cdp-node-frontend-template)
> and [cdp-node-backend-template](https://github.com/DEFRA/cdp-node-backend-template) at Defra are built with
> [Hapi.js](https://hapi.dev/)

- For information on the `GOV.UK Prototype Kit` see https://prototype-kit.service.gov.uk/docs/
- For tutorials on how to use the `GOV.UK Prototype Kit`
  see https://prototype-kit.service.gov.uk/docs/tutorials-and-guides
- For help with the underlying `GOV.UK Frontend` see:
  - https://design-system.service.gov.uk/
  - https://github.com/alphagov/govuk-frontend

> [!WARNING]
> The `nrf-prototypes` is not a production ready application, it is a tool for prototyping. It is not
> designed to be used in production or to be resilient, secure or performant, nor should it be. It is designed to be
> used for prototyping ideas and testing them with users. It's a great tool for prototyping GOV web applications.

## Using the refreshed GOV.UK brand

The refreshed GOV.UK brand is available and turned on by default in the `nrf-prototypes`. To turn it
off simply go to [app/config.json](./app/config.json) and set the `"rebrand"` property to `false`. This will turn off
the refreshed brand and use the legacy brand instead.

```json
{
  "plugins": {
    "govuk-frontend": {
      "rebrand": true
    }
  }
}
```

## Setting a password

> [!CAUTION]
> Do not commit the `.env` file to GitHub, it is in the `.gitignore` file by default. Sensitive information such as a
> password can be provided to a prototype via the Secrets page of your prototype in the CDP Portal Frontend

Basic authentication is on by default in CDP environments for prototypes. This means you will need to set a password
for your prototype. You can do this via your prototypes secrets tab in the Portal Frontend. For information on how to do
this, follow these steps:

1. Read the **Setting a password** section on https://prototype-kit.service.gov.uk/docs/publishing
1. Go to the CDP Portal Frontend
1. Log in
1. Navigate to your prototype on the services list page
1. Navigate to your prototypes `Secrets` tab
1. Add a secret with a name `PASSWORD` and a `value` of your choosing
1. Re-deploy your prototype for the new secrets to be made available to it

## Setting multiple passwords

The `GOV.UK Prototype Kit` has the ability to set up multiple passwords via secrets. For more information on how to do
this read the **If you want to create additional passwords** section on
https://prototype-kit.service.gov.uk/docs/publishing. To add a secret to an environment your prototype is running in
see [Creating a secret](#creating-a-secret)

## Removing the need for a password

By default, the `GOV.UK Prototype Kit` requires a password has been set on your prototype when it has been deployed to
an environment. If you would like to turn off this requirement you can do so by setting the following environment
variable:

```dotenv
ENV USE_AUTH=false
```

This can be set in `cdp-app-config` for instructions on how to do so
read [Environment Variables on CDP](#environment-variables-on-cdp).

## Map and Vector Tiles

This prototype includes interactive maps powered by [MapLibre GL JS](https://maplibre.org/). Vector tiles are served directly from the Node.js application using pre-generated MBTiles files.

### Running with maps

Simply start the development server:

```bash
npm run dev
```

The app will automatically serve vector tiles from the MBTiles files in `tileserver/data/mbtiles/`. No separate tileserver is needed.

### Vector Tile Conversion

The map layers use vector tiles (MBTiles format) generated from GeoJSON source files. Pre-generated tiles are committed to the repository, so you typically don't need to regenerate them.

If you need to regenerate tiles from source GeoJSON files:

```bash
# Install tippecanoe (one-time setup)
npm run tiles:install

# Convert all GeoJSON layers to MBTiles
npm run tiles:convert
```

The conversion script processes GeoJSON files from `app/assets/map-layers/` and outputs MBTiles to `tileserver/data/mbtiles/`.

### How it works

- Vector tiles are stored as MBTiles files (SQLite databases) in `tileserver/data/mbtiles/`
- The Express app serves tiles directly via the `/tiles/data/{layer}/{z}/{x}/{y}.pbf` endpoint
- Tiles are read from MBTiles using `better-sqlite3` for fast, efficient access
- This approach works identically in development and production, with no external dependencies

### Production map component

`nrf-quote-7` uses the same [`@defra/interactive-map`](https://github.com/DEFRA/interactive-map) component as the live service. The package is a GOV.UK Prototype Kit plugin, so its scripts and styles are served automatically from `/plugin-assets/%40defra%2Finteractive-map/` – nothing is vendored. To upgrade, bump the pinned version in `package.json`.

- Ordnance Survey basemaps need an `OS_API_KEY` in `.env` (see `.env.template`). Without one the map offers the keyless Satellite and Streets basemaps.
- EDP overlays are served at `/impact-assessor-map/tiles/{layer}/{z}/{x}/{y}.mvt`, mirroring production's tile service. They are sliced on demand (no tippecanoe needed) from `app/lib/map/edp-data.js`, which dissolves the nutrient catchments into whole EDP outlines and holds the excluded areas. `app/assets/map-layers/edp_excluded_areas.geojson` contains the River Wensum SAC, The Broads SAC and Broadland Ramsar boundaries from [Natural England Open Data](https://naturalengland-defra.opendata.arcgis.com/) (Open Government Licence v3.0). Set `IMPACT_ASSESSOR_BASE_URL` to proxy the real service instead.
- The client code lives in `app/assets/javascripts/interactive-map/` and mirrors the production frontend's `src/client/javascripts/map/` so the two can be diffed.

## Testing with the prototype

The content-driven journeys (`nrf-quote-7` and `nrf-request-to-use-1`) have no hidden switches. What a participant types decides the path they take, so a facilitator can steer a session with the email address or the numbers they hand over. Nothing is stored between sessions and no password is ever checked.

### Sign in as different kinds of user

Signing in to "Request to use the nature restoration levy" goes through a mock GOV.UK One Login: "Create your GOV.UK One Login" and "Sign in" both lead to the email page, and any password is accepted (the "Sign in with Government Gateway" option goes to the same mock for now). The part of the email address before the `@` decides who the participant is:

| Email contains                      | Account    | What they see after signing in                                                       |
| ----------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `company` (e.g. `company@test.com`) | Company    | "What is your address?", then review your details                                    |
| `individual`                        | Individual | "What is your address?", then review your details                                    |
| anything else (e.g. `agent@…`)      | Agent      | "What are the developer details?", with the organisation bar and Change organisation |

Case does not matter, and the domain is ignored. Sign out (in the header) forgets the account so another email can be tried in the same browser.

#### Registering a Defra account first

An email whose local part contains `new` has no Defra account yet, so after the One Login password the participant is taken through the Defra ID "register a Defra account" screens before the journey continues:

| Email                  | Registration screens                                          | Account afterwards |
| ---------------------- | ------------------------------------------------------------- | ------------------ |
| `new-individual@…`     | individual (name, telephone, address, memorable word)         | Individual         |
| `new-company@…`        | business (trading in the UK, company number, contact details) | Company            |
| `new@…`, `new-agent@…` | business                                                      | Agent              |

The answer to "Are you registering as a business or organisation?" wins over the email: choosing "No, as an individual" always produces an individual, and choosing "Yes" produces a company only when the email contains `company`, otherwise an agent. Inside the registration:

- any company registration number finds the same fixture business (ACME LTD), and "This is not the right business" goes back to the number
- "No" to having a company registration number skips to the business telephone and email; "No" to being registered to trade in the UK carries on regardless
- any postcode finds the same three addresses; "Enter the address manually" and "My address is not in this list" open a manual address form
- Sign out during registration forgets everything entered so far

### Quote references, units and amounts

- A quote reference must look like `NRL-123456` (or `NRF-123456`). Any reference in that shape retrieves the fixture quote: full planning permission, 100 housing units, a red line boundary inside the Broads and Wensum EDP, and a levy of £25,000 (£250 per unit). A quote made in the quote journey earlier in the same browser session is used instead of the fixture.
- Changing the number of units on "Review and amend your quote details" recalculates the levy at £250 per unit. More units than the quote had shows the "levy increased" page; more than 15,000 units shows "not enough capacity".
- "No, delete my quote details" (on the accept levy pages or check your answers) uses the quote journey's delete pages and starts the quote afresh.
- In the quote journey, a red line boundary that does not touch an EDP ends at "no EDP"; 15,001 to 19,999 units ends at the exclusion page and 20,000 or more at "no capacity".
- "Is this a variation?" followed by "Yes" asks whether the original application was committed to the levy, and then for the original reference (same format).

### Clicking through without filling anything in

Use the "Turn errors off" link in the footer, next to Clear data, or add `?errors=false` to any page of a content-driven journey. Validation is then switched off for the rest of the browser session: every Continue works even with nothing entered or selected. Anything the participant does type is kept; a blank answer is filled in from the journey's sample answers, so later pages still show sensible details (the sample sign-in email is an agent's, so a blank email signs in as an agent). "Turn errors on" in the footer (or `?errors=true`) turns validation back on; Clear data resets it too.

### Seeing any screen without walking the journey

Add `?preview=1` to any page of a content-driven journey to render it with sample answers (`&error=1` shows its error state), or open `/tools/journeys/<journey id>` for the flow diagram and every screen side by side. The sample answers live under `preview` in `content/<journey id>/journey.yaml`; see `content/README.md` for how the journeys are written.

## Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

## Updating dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

## Environment Variables and Secrets

Environment variables and Secrets are used to configure your prototype. Where you set them can be seen in the table
below.

| Type                                                      | Environment | Where to set them                                   |
| --------------------------------------------------------- | ----------- | --------------------------------------------------- |
| Sensitive secrets and Non-sensitive environment variables | local       | `.env` file                                         |
| Sensitive secrets                                         | CDP         | CDP Portal Frontend services secrets page           |
| Non-sensitive environment variables                       | CDP         | CDP App Config repository by raising a pull request |

### Local development

> [!CAUTION]
> Do not store passwords in GitHub. Sensitive information such as a password can be provided to a prototype via the
> secrets page in the CDP Portal Frontend. The `.env` file is for local development only.

To set environment variables and secrets locally copy the [.env.template](./.env.template) file to `.env` and add any
environment variables or secrets your local environment needs.

### Environment Variables on CDP

When your prototype is running on a CDP environment, E.g. `dev` or `ext-test`. You can set environment variables via a
GitHub pull request.

To add environment variables read - https://github.com/DEFRA/cdp-documentation/blob/main/how-to/config.md. This will
guide you to add non-sensitive environment variables to the https://github.com/DEFRA/cdp-app-config repository via a
pull request.

### Environment Variables in the GOV.UK Prototype Kit

The following environment variables are available in the `GOV.UK Prototype Kit`. For more information see
their https://prototype-kit.service.gov.uk/docs/ or https://github.com/alphagov/govuk-prototype-kit.

| Name            | Value    | Description                                              |
| --------------- | -------- | -------------------------------------------------------- |
| `PASSWORD`      | `string` | Password for basic authentication                        |
| `PASSWORD_KEYS` | `string` | Comma-separated list of keys for password authentication |

### Secrets

To add sensitive environment variables know as secrets to your prototype. Add them via your prototypes secrets page on
the CDP Portal.

## Creating a secret

1. Go to the CDP Portal Frontend
1. Log in
1. Navigate to your prototype on the services list page
1. Navigate to your prototypes `Secrets` tab
1. Add a secret on your chosen environment with a `name` and `value` of your choosing
1. Re-deploy your prototype for the new secrets to be made available to it

## Docker

For the most part you will not need to be concerned with `docker` when running this prototype. Everything is set up and
your `docker` will automatically be built, published and pushed when you deploy a new version of your prototype via the
UI in the CDP Portal.

### Development image

Build:

```bash
docker build --target development --no-cache --tag nrf-prototypes:development .
```

Run:

```bash
docker run -e PORT=3000 -p 3000:3000 nrf-prototypes:development
```

### Production image

Build:

```bash
docker build --no-cache --tag nrf-prototypes .
```

Run:

> Update the password field to your password

```bash
docker run -e PASSWORD=beepBoopBeep -e PORT=3000 -p 3000:3000 nrf-prototypes
```

### Debug docker

To debug issues in docker and to have a look at the built docker container in the same way as when it runs on CDP. You
can run an interactive shell:

Build:

```bash
docker build --no-cache --tag nrf-prototypes .
```

Run:

```bash
docker run -it --entrypoint /bin/ash nrf-prototypes
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
