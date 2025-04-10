# HubSpot Seeding Strategy

This document outlines our approach to seeding a HubSpot instance with realistic test data to support our testing and validation needs, with a particular focus on time-based data changes essential for Neuco's core functionality.

## Core Testing Requirements

Neuco's primary value proposition is tracking and analyzing what CRM data did over time, enabling customers to:
- See historical states of their CRM data
- Analyze changes and trends over time
- Travel back in time to view their CRM as it was on a specific date

This seeding strategy is designed specifically to test these time-based features with realistic data patterns.

## Organization-Based Determinism

All seeded data will be tied to a specific Neuco organization:
- Each seeding run will be identified by an organization UUID
- This UUID serves as the seed value for all deterministic data generation
- Data generated for the same org UUID will be consistent across runs
- Local seed data will be stored per organization for validation

## Seeding Priorities

We will focus on seeding the following objects in order of priority:

1. **Core CRM Objects** - These form the foundation of the CRM
   - Companies
   - Contacts
   - Deals
   - Tickets

2. **Engagement Objects** - These represent interactions with the core objects
   - Notes
   - Tasks
   - Meetings
   - Calls
   - Emails

3. **Secondary Objects** (if needed)
   - Products
   - Line Items
   - Forms
   - Lists

## Time-Based Data Strategy

### Custom Effective Date Property

Since HubSpot does not allow backdating of system timestamps (`createdate` and `lastmodifieddate`), we will implement:

1. **Custom `neuco_effective_date` Property**:
   - Will be added to all seeded object types
   - Represents the "business effective date" of changes
   - Enables testing of time-based scenarios without waiting for real time to pass
   - Critical for validating Neuco's time-travel functionality

2. **HubSpot Property Setup Required**:
   - One-time setup to create custom properties in HubSpot
   - Can be done via UI or programmatically through API
   - Requires appropriate scopes (`settings`) in OAuth tokens
   - Consider property limits by plan:
     - Free: 10 per object type
     - Starter: 60 per object type
     - Professional: 1,000 per object type
     - Enterprise: 1,000+ per object type

3. **Hybrid Timestamp Approach**:
   - Real system timestamps: Used to validate actual HubSpot API behavior
   - Custom effective dates: Used to simulate business timeline for testing

### Time Simulation Strategy

Our approach to simulating time:

1. **Real-Time Operations**:
   - Create/update entities on actual days to generate real system timestamps
   - Run the script over multiple days for real incremental sync testing
   - This tests your system against HubSpot's actual API behavior

2. **Simulated Timeline**:
   - Use `neuco_effective_date` to create a business timeline that can span months or years
   - Simulate specific patterns like deal velocity or contact role changes
   - Test time-travel queries against these simulated dates

3. **Association Changes**:
   - Track association changes separately since they don't update `lastmodifieddate`
   - Create a separate log of when relationships were created or modified
   - Include these in time-travel testing

## Data Generation Approach

### 1. Deterministic Generation

All data will be generated deterministically using:
- Organization UUID as master seed
- Predefined patterns with controlled randomness
- Configurable templates
- Local storage of generated data

This approach ensures:
- Consistent test data across runs for the same organization
- Ability to recreate specific scenarios
- Support for validation against known states

### 2. Realistic Data Patterns

We'll generate data that mimics real-world patterns:

- **Companies**: 
  - Industry-appropriate names, sizes, and attributes
  - Realistic distributions across industries
  - Location-appropriate details
  - Varied company ages and lifecycle stages

- **Contacts**:
  - Realistic names, job titles, and contact information
  - Appropriate distribution of contacts per company (more for larger companies)
  - Varied engagement levels and activity history
  - Multiple contacts from same companies with related roles

- **Deals**:
  - Industry-appropriate deal sizes
  - Realistic sales cycle durations
  - Distribution across pipeline stages
  - Appropriate association with contacts and companies
  - Realistic close rates and deal progression

- **Engagements**:
  - Chronological interaction patterns
  - Increasing engagement frequency toward deal close
  - Realistic email exchanges and meeting patterns
  - Task and follow-up sequences

### 3. Time-Based Changes

We'll implement time-based changes to test Neuco's core functionality:

- **Progressive Changes**:
  - Deal progression through pipeline stages
  - Contact role changes and information updates
  - Company growth indicators (employee count, revenue)
  - Increasing engagement frequency over time

- **Lifecycle Events**:
  - Contact lifecycle stage transitions
  - Deal won/lost events
  - Company mergers or divisions
  - Customer service issue creation and resolution

- **Time Travel Support**:
  - Simulate data states across different points in time
  - Create complex change patterns with specific timestamps
  - Generate data that can validate Neuco's time-travel queries

## Object Relationships and Integrity

We'll maintain realistic relationships between objects:

1. **Company-Contact Relationships**:
   - Appropriate number of contacts per company based on company size
   - Contacts with appropriate job titles for the company
   - Hierarchical relationships (managers, reports)
   - Time-based relationship changes (promotions, transfers)

2. **Deal Associations**:
   - Multiple contacts involved in deals
   - Primary company association
   - Appropriate stakeholders based on deal size and type
   - Changes in deal stakeholders over time

3. **Engagement Patterns**:
   - More frequent engagements with high-value deals
   - Appropriate engagement types based on deal stage
   - Sequential patterns that mimic sales processes
   - Increasing or decreasing engagement velocity

## Implementation Details

### Data Storage

1. **Base Seed Data**:
   - JSON files for each object type
   - Unique identifiers for all entities
   - Reference maps for associations
   - Templates for property values
   - Organization-specific storage

2. **Change Records**:
   - Timestamped change events with both real and effective dates
   - Before/after state for each change
   - Change categories (update, status change, relationship change)
   - Association changes tracked separately

3. **Snapshots**:
   - Point-in-time captures of complete HubSpot state
   - Object relationship maps
   - Entity status summaries
   - Timeline of effective dates

### API Interaction

1. **Rate Limit Management**:
   - Batch operations where possible
   - Queuing and throttling mechanisms
   - Backoff strategies for rate limit errors

2. **Idempotent Operations**:
   - Support for resumable operations
   - Checksums to verify state
   - Transaction logs for auditing

3. **Error Handling**:
   - Graceful recovery from API failures
   - Detailed logging for troubleshooting
   - State reconciliation for partial failures

### Custom Property Management

1. **Property Setup**:
   - Script to create required custom properties
   - Validation of property existence before seeding
   - Documentation of all custom properties

2. **Usage in Seeding**:
   - Set both standard and custom properties
   - Consistent date formats
   - Business logic for effective dates

## Validation and Testing

1. **State Verification**:
   - Tools to compare expected vs. actual state
   - Support for partial state validation
   - Time-based state comparisons

2. **Integration Testing**:
   - Automated tests for data ingestion
   - Validation of change detection
   - End-to-end testing with Neuco application

3. **Performance Testing**:
   - Volume testing with configurable data size
   - Change frequency stress testing
   - Scaling tests for different HubSpot sizes

## Timeline-Based Testing

1. **Historical Data Validation**:
   - Verify Neuco can accurately represent data as of a specific date
   - Test complex time-based queries against known data patterns
   - Validate historical relationships and associations

2. **Change Sequences**:
   - Predefined sequences of changes with specific effective dates
   - Common business workflows compressed in time
   - Edge case scenarios (e.g., rapid changes, conflicting updates)

3. **Time Travel Validation**:
   - Compare state at specific points in time using `neuco_effective_date`
   - Test history API functionality
   - Validate core time-travel features of Neuco

## Configuration Options

The seeding tool will support the following configuration options:

1. **Organization Settings**:
   - Organization UUID (required for deterministic generation)
   - HubSpot portal settings
   - Authentication details

2. **Volume Controls**:
   - Number of companies, contacts, deals, etc.
   - Ratio controls (contacts per company, etc.)
   - Engagement density settings

3. **Time Settings**:
   - Date range for simulated timeline
   - Change frequency and distribution
   - Time compression options

4. **Industry Settings**:
   - Industry distribution
   - Industry-specific templates
   - Vertical-specific scenarios

5. **Randomization Controls**:
   - Variability controls for selected attributes
   - Distribution parameters for realistic data patterns

## Usage Scenarios

1. **Initial Seeding**:
   - Create a complete HubSpot instance with `neuco_effective_date` ranging over months
   - Establish baseline data for time-travel testing

2. **Incremental Change Testing**:
   - Run on consecutive days to create real system timestamp changes
   - Update a subset of records with new effective dates
   - Validate Neuco captures both real and effective dates correctly

3. **Historical Analysis Testing**:
   - Create data with a known pattern of changes over time
   - Test Neuco's ability to show "what happened when"
   - Validate time-based analytics and reporting

4. **Edge Case Testing**:
   - Generate specific time-based edge cases
   - Test system behavior with complex change patterns
   - Validate handling of relationship changes over time

## Technical Requirements

1. **Authentication**:
   - Support for OAuth tokens with appropriate scopes
   - Secure credential handling
   - Token refresh capabilities

2. **Local Storage**:
   - Efficient storage of large datasets
   - Version control friendly formats
   - Support for compression

3. **Performance**:
   - Multi-threaded operations where appropriate
   - Optimized API usage
   - Progress tracking and reporting

This strategy provides a comprehensive approach to seeding HubSpot with realistic test data that supports validation of Neuco's core time-travel capabilities, ensuring customers can accurately track and analyze their CRM data across time.