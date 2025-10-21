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
[The functionality defined in technical detail. Include the API Responses as examples from below]

---

# Context

The project is a prototype that uses the govuk-prototype-kit which is already installed. You will not need to create any tests as it's just a prototype. Any new pages will conform to GDS standards using the GOV.UK design system components and patterns as well as GOV.UK Accessibility Guidelines.

# Detailed Requirements

- You need to create an interface that acts as an index for different user journeys. Each user journey will be an expriment that will be trialled with stakeholders.
- The index will contain a list containing the name for the user journey that is hyperlinked and the description of the user journey.
- The values in the table can be hard-coded into the page.
- Each hyperlink in the index will link to the route of that page.
- Create one user journey with a basic start page to demonstrate the concept.

# Verification Checklist

- The user story contains format and content as defined above. It does not need to have any additional sections.

- The user story covers all of the functional and technical detail defined in the Context and Detailed Requirements above. It does not need to have any additional technical details.

- The user story as a markdown file. Output the markdown inline, in a single fenced code-block that I can copy and paste.
