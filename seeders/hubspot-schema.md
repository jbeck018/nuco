# HubSpot Object Schema and Integration

This document outlines the primary objects available in the HubSpot CRM API, their key properties, their relationships, and our implementation details for data seeding.

## Core CRM Objects

HubSpot's CRM is built around several standard objects that can be accessed through the API. Each object has standard and custom properties.

### 1. Contacts

Contacts represent individual people in the CRM.

**Key Properties:**
- `email` (Primary identifier)
- `firstname`
- `lastname`
- `phone`
- `address`
- `company` (Text field, not a direct association)
- `jobtitle`
- `lifecyclestage` (Lead, Marketing Qualified Lead, etc.)
- `hs_lead_status`
- `lastmodifieddate`
- `createdate`

**Relationships:**
- Can be associated with Companies (many-to-one)
- Can be associated with Deals (many-to-many)
- Can be associated with Tickets (many-to-many)
- Can have Engagements (one-to-many)

**API Endpoint:** `/crm/v3/objects/contacts`

### 2. Companies

Companies represent organizations in the CRM.

**Key Properties:**
- `name`
- `domain` (Often used as a unique identifier)
- `industry`
- `address`
- `city`
- `state`
- `zip`
- `phone`
- `website`
- `numberofemployees`
- `annualrevenue`
- `lastmodifieddate`
- `createdate`

**Relationships:**
- Can have multiple Contacts (one-to-many)
- Can be associated with Deals (one-to-many)
- Can be associated with Tickets (one-to-many)
- Can have Engagements (one-to-many)

**API Endpoint:** `/crm/v3/objects/companies`

### 3. Deals

Deals represent sales opportunities in the CRM.

**Key Properties:**
- `dealname`
- `amount`
- `dealstage` (Pipeline stage)
- `pipeline` (Which pipeline the deal belongs to)
- `closedate`
- `dealtype`
- `priority`
- `lastmodifieddate`
- `createdate`

**Relationships:**
- Associated with Contacts (many-to-many)
- Associated with Companies (many-to-one)
- Can have Line Items (one-to-many)
- Can have Engagements (one-to-many)

**API Endpoint:** `/crm/v3/objects/deals`

### 4. Tickets

Tickets represent customer service issues in the CRM.

**Key Properties:**
- `subject`
- `content`
- `hs_pipeline` (Which pipeline the ticket belongs to)
- `hs_pipeline_stage` (Current stage)
- `hs_ticket_priority`
- `lastmodifieddate`
- `createdate`

**Relationships:**
- Associated with Contacts (many-to-many)
- Associated with Companies (many-to-one)
- Can have Engagements (one-to-many)

**API Endpoint:** `/crm/v3/objects/tickets`

### 5. Products

Products represent items that can be sold.

**Key Properties:**
- `name`
- `description`
- `price`
- `hs_sku`
- `lastmodifieddate`
- `createdate`

**Relationships:**
- Associated with Line Items (one-to-many)

**API Endpoint:** `/crm/v3/objects/products`

### 6. Line Items

Line items represent individual product purchases within a deal.

**Key Properties:**
- `name`
- `quantity`
- `price`
- `amount` (Calculated from price and quantity)
- `lastmodifieddate`
- `createdate`

**Relationships:**
- Associated with Deals (many-to-one)
- Associated with Products (many-to-one)

**API Endpoint:** `/crm/v3/objects/line_items`

## Engagement Objects

HubSpot tracks various types of interactions with contacts and companies.

### 7. Engagements

Engagements are activities or interactions with contacts, companies, deals, or tickets.

**Types of Engagements:**
- Calls
- Emails
- Meetings
- Notes
- Tasks

**Key Properties:**
- `type` (CALL, EMAIL, MEETING, NOTE, TASK)
- `timestamp`
- `title`
- `body`
- `ownerId`

**Relationships:**
- Associated with Contacts
- Associated with Companies
- Associated with Deals
- Associated with Tickets

**API Endpoint:** `/crm/v3/objects/engagements`

### 8. Calls

Represents phone call interactions.

**Key Properties:**
- `hs_call_body`
- `hs_call_direction`
- `hs_call_disposition`
- `hs_call_duration`
- `hs_call_recording_url`

**API Endpoint:** `/crm/v3/objects/calls`

### 9. Emails

Represents email interactions.

**Key Properties:**
- `hs_email_subject`
- `hs_email_text`
- `hs_email_html`
- `hs_email_status`
- `hs_email_direction`

**API Endpoint:** `/crm/v3/objects/emails`

### 10. Meetings

Represents scheduled meetings.

**Key Properties:**
- `hs_meeting_title`
- `hs_meeting_body`
- `hs_meeting_start_time`
- `hs_meeting_end_time`
- `hs_meeting_location`

**API Endpoint:** `/crm/v3/objects/meetings`

### 11. Notes

Represents notes about contacts, companies, deals, or tickets.

**Key Properties:**
- `hs_note_body`

**API Endpoint:** `/crm/v3/objects/notes`

### 12. Tasks

Represents to-do items.

**Key Properties:**
- `hs_task_body`
- `hs_task_subject`
- `hs_task_status`
- `hs_task_priority`
- `hs_task_due_date`

**API Endpoint:** `/crm/v3/objects/tasks`

## Marketing Objects

### 13. Forms

Forms used to collect information from website visitors.

**Key Properties:**
- `name`
- `portal_id`
- `created_at`
- `updated_at`
- `style`

**API Endpoint:** `/forms/v2/forms`

### 14. Form Submissions

Records of form submissions by contacts.

**Key Properties:**
- `form_id`
- `contact_id`
- `page_url`
- `timestamp`
- `values` (Array of form field values)

**API Endpoint:** `/forms/v2/submissions`

### 15. Lists

Lists of contacts used for marketing.

**Types:**
- Static Lists (manually managed)
- Dynamic Lists (based on criteria)

**Key Properties:**
- `name`
- `dynamic`
- `portal_id`
- `created_at`
- `updated_at`

**API Endpoint:** `/contacts/v1/lists`

## Custom Objects

HubSpot allows for the creation of custom objects to represent business-specific entities.

**Key Properties:**
- Custom objects have standard system properties like `createdate` and `lastmodifieddate`
- All other properties are defined by the user

**Relationships:**
- Can be associated with standard objects or other custom objects

**API Endpoint:** `/crm/v3/objects/{objectType}`

## Associations Between Objects

HubSpot uses associations to create relationships between objects.

**Association Types:**
1. **Standard Associations**: Pre-defined relationships between standard objects
2. **Custom Associations**: User-defined relationships

**API Endpoints:**
- Create: `/crm/v3/associations/{fromObjectType}/{fromObjectId}/to/{toObjectType}/{toObjectId}`
- Get: `/crm/v3/associations/{fromObjectType}/{fromObjectId}/to/{toObjectType}`
- Batch: `/crm/v3/associations/{fromObjectType}/batch/read`

## Pipelines and Stages

Deals, Tickets, and some custom objects can be organized into pipelines with stages.

**Pipeline Properties:**
- `label`
- `displayOrder`
- `active`
- `stages` (Array of stage objects)

**Stage Properties:**
- `label`
- `displayOrder`
- `probability` (for deal stages)

**API Endpoint:** `/crm/v3/pipelines/{objectType}`

## Properties API

HubSpot exposes APIs to retrieve metadata about object properties.

**Property Group Properties:**
- `name`
- `label`
- `displayOrder`

**Property Properties:**
- `name`
- `label`
- `type` (string, number, date, enumeration, etc.)
- `fieldType`
- `groupName`
- `options` (for enumeration types)

**API Endpoint:** `/properties/v2/{objectType}/properties`

## API Limitations and Quotas

- **Rate Limits**: HubSpot limits API calls based on account tier
  - Basic: 100 calls per 10 seconds
  - Professional: 200 calls per 10 seconds
  - Enterprise: 400 calls per 10 seconds

- **Daily Limits**: There are daily limits on specific operations
  - Contact create/update: 1,000,000 per day
  - List operations: 300,000 per day

- **Batch Processing**: Most endpoints support batch operations to optimize API usage
  - Maximum batch size is typically 100 objects per request

## Additional Considerations

1. **Lifecycle Stages**: Contacts and companies follow lifecycle stages (e.g., subscriber, lead, customer)
2. **Owner Assignment**: Most objects can be assigned to owners (HubSpot users)
3. **Timestamps**: HubSpot stores timestamps in milliseconds since epoch
4. **Historic Data**: Some objects (like contacts) maintain historic property values
5. **Property History API**: Available for retrieving the history of property changes

## Implementation Details for Our Seeding Process

### HubSpot Specific Values

Our implementation uses HubSpot-specific values directly in our generators to ensure compatibility:

1. **Company Industries**:
   - Valid values: `COMPUTER_SOFTWARE`, `HOSPITAL_HEALTH_CARE`, `FINANCIAL_SERVICES`, `MANUFACTURING`, `RETAIL`, `EDUCATION_MANAGEMENT`, etc.
   - We select from these predefined values rather than mapping generic industries

2. **Deal Stages**:
   - Default pipeline stages: `appointmentscheduled`, `qualifiedtobuy`, `presentationscheduled`, `decisionmakerboughtin`, `closedwon`, `closedlost`
   - Our generators use these specific IDs for compatibility

3. **Date Formats**:
   - `closedate`, `createdate`: Milliseconds since epoch (Unix timestamp * 1000)
   - Example: `1613055600000` (February 11, 2021)

### Deterministic Generation Approach

Our data generation is deterministic, allowing for consistent generation across runs:

1. **Seed-based Generation**:
   - Uses organization UUID as a seed for randomness
   - Ensures the same organization ID always produces the same data set

2. **Relationship Modeling**:
   - Company to Contacts: One-to-many relationships with realistic distribution
   - Deal progression patterns: Models realistic sales cycles with appropriate timing

3. **Local Storage Structure**:
   - `data/{organizationId}/base/`: Initial generated data
   - `data/{organizationId}/changes/`: Simulated changes over time
   - `data/{organizationId}/snapshots/`: Point-in-time snapshots

### Upload Process

The upload process handles mapping between our internal IDs and HubSpot IDs:

1. **Object Creation Order**:
   - Companies → Contacts → Deals
   - Creates objects first, then creates associations

2. **Association Management**:
   - Contact-Company Association (Type ID: 1)
   - Deal-Company Association (Type ID: 5)
   - Deal-Contact Association (Type ID: 3)

3. **Rate Limit Management**:
   - Batch processing to reduce API calls
   - Configurable delays between requests
   - Error handling with retries for failed operations

4. **ID Mapping**:
   - Maintains mapping between internal IDs and HubSpot IDs
   - Stored in `data/{organizationId}/hubspot-id-mappings.json`

### Phase 2 Expansion Plans

In Phase 2, we plan to expand our HubSpot integration with:

1. **Additional Object Types**:
   - Tickets for support tracking
   - Products and Line Items for more complex deal modeling
   - Tasks, Notes, and other engagement objects
   
2. **Time-based Change Simulation**:
   - Property updates over time
   - Object state transitions
   - Historical snapshots for time-travel testing

3. **Advanced Relationship Modeling**:
   - More complex company hierarchies
   - Contact relationships and influence networks
   - Multi-touch attribution modeling

This document provides an overview of the main objects and their relationships in HubSpot, as well as our implementation approach. For the most up-to-date and detailed information, always refer to the [official HubSpot API documentation](https://developers.hubspot.com/docs/api/overview).