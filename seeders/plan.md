# CRM Data Seeding Plan

## Overview
This directory will contain scripts for seeding HubSpot and/or Salesforce with realistic test data to validate our ingestion flows and change tracking functionality. The system provides deterministic data generation with local storage of seed data to enable time travel testing and validation.

## Goals
- Create a deterministic but configurable data seeding process
- Support both initial data creation and incremental updates
- Generate realistic data patterns that mimic customer usage
- Allow for testing change detection across various entity types
- Enable testing of our AI analysis features with meaningful data
- Facilitate time travel validation by maintaining local snapshots
- Support comparison between expected and actual CRM data states

## Implementation Details

### Directory Structure
```
/seeders/
  /hubspot/
    /data/
      /base/            # Initial seed data
      /changes/         # Time-series changes to apply
      /snapshots/       # Point-in-time captures of state
    generator.ts        # Creates base test data
    change-generator.ts # Creates realistic entity changes
    time-machine.ts     # Applies changes with timestamps
    uploader.ts         # Handles HubSpot API interaction
    exporter.ts         # Pulls data from HubSpot for comparison
    validator.ts        # Compares expected vs actual data
    index.ts            # CLI interface
```

### Core Components
1. **Configuration Management**
   - Load CRM credentials from environment or config file
   - Define seeding parameters (record counts, change frequencies)
   - Support HubSpot and Salesforce APIs
   - Store seed configuration for deterministic reruns

2. **Data Generation**
   - Companies/Accounts with realistic attributes
   - Contacts with varied properties and relationships
   - Deals/Opportunities in different stages
   - Activities and engagement data
   - Custom objects/records as needed
   - Store generated seed data locally with unique identifiers

3. **Change Management**
   - Track previously created records with version history
   - On subsequent runs, selectively update a subset of records
   - Introduce predictable but varied changes to test detection
   - Support for "deleting" some records to test deletion tracking
   - Maintain time-versioned changes for time travel testing

4. **Execution Modes**
   - Initial seeding mode (clean slate)
   - Update mode (modify existing data)
   - Time-travel mode (backdate changes)
   - Validation mode (compare actual vs expected state)

5. **Time Travel Features**
   - Store entity state at different points in time
   - Support backdating of changes for historical testing
   - Generate snapshot reports for specific timestamps
   - Validate CRM data against expected state at specific times

## Usage
```bash
# Initial seeding
bun seed:crm --target=hubspot --mode=initial --config=./configs/seed-config.json

# Update existing data
bun seed:crm --target=hubspot --mode=update --config=./configs/seed-config.json

# Time travel mode (create backdated changes)
bun seed:crm --target=hubspot --mode=timetravel --config=./configs/seed-config.json

# Validation mode (compare actual vs expected state)
bun seed:crm --target=hubspot --mode=validate --snapshot=2025-03-15 
```

## Data Schema

### Company/Account Records
- Name, industry, size, revenue
- Address information
- Founded date
- Website, social profiles
- Custom fields

### Contact Records
- Name, email, phone
- Job title, department
- Company association
- Activity history
- Communication preferences

### Deal/Opportunity Records
- Name, amount, close date
- Pipeline stage
- Associated company/contacts
- Products/services
- Custom fields

## Validation Features
- Generate diffs between expected and actual CRM state
- Validate our database's historical record accuracy
- Ensure completeness of data ingestion
- Track entity lifecycle across time periods
- Test time-based queries against known historical states

## Testing Integration
This seeding system will integrate with our testing framework to allow automated validation of:
1. Data ingestion completeness
2. Change detection accuracy
3. AI analysis and question answering features
4. Time travel capabilities across the entire system