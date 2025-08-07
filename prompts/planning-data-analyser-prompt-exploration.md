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
[The functionality defined in technical detail.  Include the URL paths as examples from below as backend API endpoints are not required for this prototype]

---

# Context

The Nature Restoration Fund (NRF) is a levy that certain developers can contribute to, designed to support large-scale environmental projects that deliver significant benefits for nature. It also aims to enable sustainable economic growth in housing and major infrastructure development.

Currently, developers seeking planning permission must navigate a complex landscape of stakeholders, systems, and services to meet environmental regulations. This process is often inefficient, costly, and difficult to use.

Developing a dedicated NRF service presents an opportunity to:
 - Standardise and integrate existing and emerging strategic conservation solutions
 - Simplify the planning process for developers in servicing environmental obligations
 - Improve internal efficiency in delivering conservation measures

## Feature Context
As part of the Nature Restoration Fund service, data analysis needs to be carried out on planning application and Local Planning Authority data. The data will be used by an ETL process:
- Extract: JSON data will be retrieved from the planning and housing data platform and stored locally
- Transform: the data will be analysed with the use of an LLM and an enhanced data set produced that includes additional fields and a new planning application analysis data set
- Load: the data sets will be stored to CSV files so they can be reviewed and used


# Detailed Requirements

JSON Data will be retrieved from the planning and housing data platform in chunks of 1000 records at a time until the full datasets have been retrieved and persisted to a JSON file. Once data retrieval has completed, analysis of the data will begin. Data transformation will involve reviewing the description field of the planning application JSON data using an LLM to supplement the following data points to a copy of the planning data dataset
 - a list of the planning application data supplemented with the number of houses to be built in the application and a development category field to indicate 
   - house build: whether the site is to build one or more new dwellings
   - extension: an extension to an existing dwelling
   - renovation: a renovation to an existing dwellling
   - something else: you will identify additional categories as relevant
   - Local authority name: query the local authority data set by organisation ID
   - Local planning authority name: query the local planning authority data set by local-planning-authority / reference 


Analysis will involve reading the enhanced planning application dataset and identiying the following data points:
- the number of applications by development category
- the maximum, minimum and average number of houses in a house build category application
- the number of applications split by ranges of houses in the site: 1 - 5, 5 - 10, 10 - 20, 20 - 50, 50 - 100, 100 - 200, 200 - 500, 500+

Outputs will include the following:
- a list of the local planning authorities in CSV format
- a list of the enhanced planning application data in CSV format
- a list of the analysis data in CSV format

# Verification Checklist
- The user story contains format and content as defined above. It does not need to have any additional sections.

- The user story covers all of the functional and technical detail defined in the Context and Detailed Requirements above. It does not need to have any additional technical details.  

- The user story as a markdown file. Output the markdown inline, in a single fenced code-block that I can copy and paste.
