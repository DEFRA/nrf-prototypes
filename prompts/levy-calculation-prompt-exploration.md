You are a senior business analyst working in a software delivery team in UK Government.

Create a detailed user story document in markdown format for the feature requirements below.

The audience is a software delivery team who will build and test the application, which includes a functional audience and a technical audience.

Produce the user story as a markdown file. Output the markdown inline, in a single fenced code-block that I can copy and paste. Ensure you escape inline code blocks correctly.

Think step by step and explain your thinking before producing the markdown file.

# User Story Format

The format and content of the user story must be as follows:

User Story:
[User story summary in "AS A, I WANT, SO THAT" format. This must be functional and must omit technical details]

Acceptance Criteria:
[Written as Behavior Driven Development (BDD) Scenarios. The BDD scenarios should focus more on functional/user-driven actions. Omit technical details. Group functionality so that we keep the number of scenarios to a minimum]

Interface Design:
[Relevant user interface design. This is a GOV.UK Application so it should follow GOV.UK guidelines including the GDS Design System and Accessibility. Ensure you include the GDS Components needed for the interface]

Technical Design:
[The functionality defined in technical detail. Include the URL paths as examples from below as backend API endpoints are not required for this prototype]

---

# Context

The Nature Restoration Fund (NRF) is a levy that certain developers can contribute to, designed to support large-scale environmental projects that deliver significant benefits for nature. It also aims to enable sustainable economic growth in housing and major infrastructure development.

Currently, developers seeking planning permission must navigate a complex landscape of stakeholders, systems, and services to meet environmental regulations. This process is often inefficient, costly, and difficult to use.

Developing a dedicated NRF service presents an opportunity to:

- Standardise and integrate existing and emerging strategic conservation solutions
- Simplify the planning process for developers in servicing environmental obligations
- Improve internal efficiency in delivering conservation measures

## Feature Context

As part of the Nature Restoration Fund service, housing developers will need a feature to identify whether their proposed housing development falls within a boundary defined in a UK government publication called an Environmental Development Plan. They will also need to understand the cost of any environmental migigations such as building new ponds, they will be expected to pay due to the impact of the housing development. The impact is calculated based off data provided by the developers. This data will differ depending on the species or habitat the EDP covers, e.g., nutrient mitigation, great crested newts or others yet to be determined.

As part of the Nature Restoration Fund service, housing developers will need a feature to submit details of the housing development so that a calculation engine will determine whether the proposed housing development falls within a boundary defined in a UK government publication called an Environmental Development Plan which means it will be succeptable to a levy. The calculation engine will use the developer supplied data to calculate the levy and it will be used to pay for environmental migigations such as building new ponds. This data requested of the developer will differ depending on the species or habitat that the EDP covers, e.g., nutrient mitigation, great crested newts or others yet to be determined.

The known data points the developers will need to provide are as follows:

| Species or habitat                                     | Data points                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Nutrient mitigation                                    | location of development site, name of waste water treatment site being used for the housing development |
| District Level Licensing (DLL) for Great-crested Newts | location of development site, number of houses in the development                                       |

The location of the development is common across species and habitats and can come in the form of a geospatial shape file, a post code or positional coordinates. The service will also provide a feature to draw out a polygon shape in the UI if the user doesn't have access to a ready-made shape file.

# Detailed Requirements

- assume a user has already authenticated and is already logged in and there is a menu option in the top right to access the user's account details
- Display a list of development sites the user has uploaded with the status of the application - pending payment | paid | approved
- For any existing applications, allow the user to see
- the redline boundary they submitted on a map
- the number of houses or waste water treatment sites they submitted
- the quote received and whether it was accepted
- a flag indicating if payment was made
- display an interface to submit a new application that will accept a file upload, a post code lookup and coordinates for the housing development similar to the local land charges search by map feature: https://search-local-land-charges.service.gov.uk/search/find-search-area
- If an EDP for DLL applies to the location of the housing development, only the shape file upload page is required to capture the redline boundary. Note, the file must contain layers for:
- the development site
- any ponds identified on the site
- If an EDP for Nutrient Mitigation applies to the EDP, display a form to capture:
  - the waste water treatment site that will be used by the development. This will be a drop down list of site names within 50 miles of the development site
  - the number of houses in the development site
- If both DLL and Nutrient Mitigation apply, capture:
  - the number of houses in the development
  - the waste water treatment site
  - the redline boundary of the development site
  - the boundary of the ponds on the site
- Once the data is collected, display a page summarising the following:
  - a quote for the levy the developer will have to pay for the environmental impact of the development site
  - a map with a redline boundary of the development site and any other redlines associated with DLL or nutrient mitigation areas
  - a list of the EDPs that the housing development crosses into
  - a breakdown of the environmental impact of the development for which the levy is required
  - a button to accept the quote
- If the quote is accepted, go through a GOV.UK Pay payment flow

# Verification Checklist

- The user story contains format and content as defined above. It does not need to have any additional sections.
- The user story covers all of the functional and technical detail defined in the Context and Detailed Requirements above. It does not need to have any additional technical details.
- The user story as a markdown file. Output the markdown inline, in a single fenced code-block that I can copy and paste.
