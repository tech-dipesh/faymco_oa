# Payout Management System
SDE Intern assignment With Express With Low Level Design and Api Development With Database Schema.


## Docs:
- The Low Level Design is on the `docs/lld.md` Which have the Actual Design and the My Though Process with Edge Case and trade Offs.
- All the Api that include on the Project with all the api endpoints are on the: `docs/api.md`
## Local Setup:
i. ``` cp .env.example. .env``` # Or Manually Create a .env and Fill a: `DATABASE` with local postgres URL or the Remote Url: 
ii. `bun install`
  - AS my Primary Package Manager is Bun If you don't want you can do with: `npm install`
iii. `bun migrate` This MIgrate all Raw Db Table Creation to a Db Setup.
iv. `bun seed` Send a Test User to the db.
v. `bun start` Run Our Server

## Tech Stack:
- Db: Postgres
- Validation: Zod
- Http Server: Express
- Packager Runner Manager: Bun


## Every Folder:
- `docs/` Actual Lld entities, relationshihps, business rules with Postman REady Endpoint List
- `src/schema.sql` The $ tables
- `src/services` The real Logical Concept such as reconciliation withdrawls recovery with row locked transcations.
- `src/routes/` Thin wiring+ validation
- `src/validation` Zod Validation
