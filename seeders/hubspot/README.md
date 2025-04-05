# HubSpot Seeder and Association Tool

This tool allows you to generate, upload, and associate test data in HubSpot CRM. It handles all main CRM entities including companies, contacts, deals, tickets, notes, and tasks.

## Quick Start

To run the complete workflow (seed, upload, and associate):

```bash
bun run seeders/hubspot/seed-upload-associate.ts <organization-id>
```

This will:
1. Set up custom properties in HubSpot
2. Generate seed data locally
3. Clean up existing data in HubSpot
4. Upload entities to HubSpot
5. Create all associations between entities

The script runs fully automatically without requiring any user interaction.

## Command Line Options

- `<organization-id>`: The ID for the organization (default: "test-org-small")
- `--no-cleanup`: Skip the cleanup step (useful for adding to existing data)

## Individual Scripts

If you want to run the steps separately:

1. Setup custom properties:
   ```bash
   bun run seeders/hubspot/setup-properties.ts
   ```

2. Generate seed data:
   ```bash
   bun run seeders/hubspot/seed-hubspot.ts <organization-id>
   ```

3. Clean up existing data:
   ```bash
   bun run seeders/hubspot/cleanup-hubspot.ts
   ```

4. Upload data:
   ```bash
   bun run seeders/hubspot/hubspot-uploader.ts <organization-id>
   ```

5. Export associations:
   ```bash
   bun run seeders/hubspot/export-associations.ts <organization-id>
   ```

6. Create associations:
   ```bash
   bun run seeders/hubspot/create-associations.ts <organization-id>
   ```

## Association Strategy

We use a hierarchy-based approach for creating associations, where higher-ranked entities are on the left side of the association:

1. Company (highest rank)
2. Contact
3. Deal
4. Ticket
5. Note/Task (lowest rank)

See [HUBSPOT-ASSOCIATION-STRATEGY.md](./HUBSPOT-ASSOCIATION-STRATEGY.md) for complete details on our association strategy, including the correct association type IDs.

## Configuration

Default configuration settings can be found at the top of `seed-upload-associate.ts`:

```typescript
const DEFAULT_ORG_ID = 'test-org-small';
const COMPANY_COUNT = 1;
const CONTACT_MIN = 1;
const CONTACT_MAX = 2;
const BASE_DIR = path.join(__dirname, 'data');
```

## Environment Setup

This tool requires a HubSpot Personal Access Token, set as an environment variable in your `.env` file:

```
HUBSPOT_TEST_PAT=your_hubspot_personal_access_token
```

## Data Structure

Generated data is stored in:
```
./seeders/hubspot/data/<organization-id>/
```

- `/base/`: Contains the base entities (companies, contacts, deals, etc.)
- `/associations.json`: The exported associations to create
- `/association-results.json`: Results of creating associations
- `/hubspot-id-mappings.json`: Mappings between local IDs and HubSpot IDs