# HubSpot Association Strategy

Based on our testing with the HubSpot API, we've established a consistent strategy for creating associations between different entity types in HubSpot.

## Hierarchy-based Association Approach

We've established a clear hierarchy of entities, with associations always flowing from higher-ranked entities to lower-ranked entities:

**Entity Hierarchy (highest to lowest):**
1. Company (highest)
2. Contact
3. Deal
4. Ticket
5. Note
6. Task (lowest)

This ensures that:
- Company is always on the left in all its associations
- Contact is on the left except when associated with Company
- Deal is on the left except when associated with Company or Contact
- Ticket is on the left except when associated with Company, Contact, or Deal
- Notes and Tasks are always on the right

## Association Types and IDs

### Verified Working Associations

| Relationship | Direction | Association Type ID | Status |
|--------------|-----------|---------------------|--------|
| Company → Contact | Company → Contact | 2 | ✅ Works |
| Company → Deal | Company → Deal | 6 | ✅ Works |
| Company → Ticket | Company → Ticket | 340 | ✅ Works |
| Company → Note | Company → Note | 189 | ✅ Works |
| Company → Task | Company → Task | 191 | ✅ Works |
| Contact → Deal | Contact → Deal | 4 | ✅ Works |
| Contact → Ticket | Contact → Ticket | 15 | ✅ Works |

### Contact, Deal, and Ticket Associations to Notes and Tasks

We've tested various association type IDs and found some corrections to the HubSpot documentation:

| Relationship | Direction | Documented ID | Correct ID | Status |
|--------------|-----------|---------------|------------|--------|
| Contact → Note | Contact → Note | 204 | 201 | ✅ Works with ID 201 |
| Contact → Task | Contact → Task | 206 | 203 | ✅ Works with ID 203 |
| Deal → Note | Deal → Note | 214 | 213 | ✅ Works with ID 213 |
| Deal → Task | Deal → Task | 216 | 215 | ✅ Works with ID 215 |
| Ticket → Note | Ticket → Note | 234 | 227 | ✅ Works with ID 227 |
| Ticket → Task | Ticket → Task | 236 | 229 | ✅ Works with ID 229 |

**Key Findings**: 
- The Contact → Note association works with type ID 201
- The Contact → Task association works with type ID 203
- The Deal → Note association works with type ID 213
- The Deal → Task association works with type ID 215
- The Ticket → Note association works with type ID 227
- The Ticket → Task association works with type ID 229

## Implementation Examples

### CRM Objects

```typescript
// Company to Contact
await client.crm.associations.v4.basicApi.create(
  'companies',
  companyId, 
  'contacts',
  contactId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 2 }]
);

// Company to Deal
await client.crm.associations.v4.basicApi.create(
  'companies',
  companyId,
  'deals',
  dealId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 6 }]
);

// Company to Ticket
await client.crm.associations.v4.basicApi.create(
  'companies',
  companyId,
  'tickets',
  ticketId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 340 }]
);

// Contact to Deal
await client.crm.associations.v4.basicApi.create(
  'contacts',
  contactId,
  'deals',
  dealId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 4 }]
);

// Deal to Ticket
await client.crm.associations.v4.basicApi.create(
  'deals',
  dealId,
  'tickets',
  ticketId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 27 }]
);
```

### Engagement Objects (Notes and Tasks)

For notes and tasks, we have two options:

#### Option 1: Specify associations during creation (preferred)

```typescript
// Create a note with associations
const noteWithAssociations = {
  properties: {
    hs_note_body: "This is a note",
    hs_timestamp: Date.now()
  },
  associations: [
    {
      to: { id: "123" }, // Note ID
      types: [
        { 
          associationCategory: "HUBSPOT_DEFINED", 
          associationTypeId: 204 // Contact to Note
        }
      ]
    }
  ]
};

const createdNote = await client.crm.objects.notes.basicApi.create(noteWithAssociations);
```

```typescript
// Create a task with associations
const taskWithAssociations = {
  properties: {
    hs_task_subject: "Follow up",
    hs_task_body: "Need to follow up",
    hs_task_status: "NOT_STARTED",
    hs_task_priority: "HIGH",
    hs_timestamp: Date.now()
  },
  associations: [
    {
      to: { id: "123" }, // Task ID
      types: [
        { 
          associationCategory: "HUBSPOT_DEFINED", 
          associationTypeId: 206 // Contact to Task
        }
      ]
    }
  ]
};

const createdTask = await client.crm.objects.tasks.basicApi.create(taskWithAssociations);
```

#### Option 2: Create associations after creation

```typescript
// Company to Note association
await client.crm.associations.v4.basicApi.create(
  'companies',
  companyId,
  'notes',
  noteId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 189 }]
);

// Contact to Note association
await client.crm.associations.v4.basicApi.create(
  'contacts',
  contactId,
  'notes',
  noteId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }]
);

// Company to Task association
await client.crm.associations.v4.basicApi.create(
  'companies',
  companyId,
  'tasks',
  taskId,
  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 191 }]
);
```

## References

- [HubSpot Associations V4 API Documentation](https://developers.hubspot.com/docs/guides/api/crm/associations/associations-v4)
- [HubSpot CRM Objects API Documentation](https://developers.hubspot.com/docs/guides/api/crm/objects)