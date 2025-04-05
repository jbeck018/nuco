/**
 * HubSpot Association Exporter
 * 
 * This script exports all associations that need to be created between HubSpot entities.
 * It reads the HubSpot ID mappings from a previous upload and generates a JSON file
 * with all the necessary associations to create.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

// Define the association types by object type
// Following our hierarchy-based approach where higher-ranked entities are always on the left
const ASSOCIATION_TYPES = {
  // Company associations (highest rank)
  'company-contact': 2,   // Company to Contact
  'company-deal': 6,      // Company to Deal
  'company-ticket': 340,  // Company to Ticket
  'company-note': 189,    // Company to Note
  'company-task': 191,    // Company to Task
  
  // Contact associations
  'contact-deal': 4,      // Contact to Deal
  'contact-ticket': 15,   // Contact to Ticket
  'contact-note': 201,    // Contact to Note (corrected from testing)
  'contact-task': 203,    // Contact to Task (corrected from testing)
  
  // Deal associations
  'deal-ticket': 27,      // Deal to Ticket
  'deal-note': 213,       // Deal to Note (corrected from testing)
  'deal-task': 215,       // Deal to Task (corrected from testing)
  
  // Ticket associations
  'ticket-note': 227,     // Ticket to Note (corrected from testing)
  'ticket-task': 229,     // Ticket to Task (corrected from testing)
};

async function exportAssociations(organizationId: string, baseDir: string = './seeders/hubspot/data') {
  console.log(`Exporting associations for organization: ${organizationId}`);
  
  // Paths
  const orgDir = path.join(baseDir, organizationId);
  const mappingsPath = path.join(orgDir, 'hubspot-id-mappings.json');
  const baseDataDir = path.join(orgDir, 'base');
  const associationsOutputPath = path.join(orgDir, 'associations.json');
  
  // Check if mappings file exists
  if (!fs.existsSync(mappingsPath)) {
    throw new Error(`HubSpot ID mappings file not found at ${mappingsPath}. Please upload entities first.`);
  }
  
  // Load the ID mappings
  const mappings = await fs.readJson(mappingsPath);
  console.log('Loaded ID mappings with counts:');
  Object.keys(mappings).forEach(type => {
    if (type !== 'uploadedAt') {
      console.log(`- ${type}: ${Object.keys(mappings[type]).length} entities`);
    }
  });
  
  // Load the entity data
  const companies = await fs.readJson(path.join(baseDataDir, 'companies.json')).catch(() => []);
  const contacts = await fs.readJson(path.join(baseDataDir, 'contacts.json')).catch(() => []);
  const deals = await fs.readJson(path.join(baseDataDir, 'deals.json')).catch(() => []);
  const tickets = await fs.readJson(path.join(baseDataDir, 'tickets.json')).catch(() => []);
  const notes = await fs.readJson(path.join(baseDataDir, 'notes.json')).catch(() => []);
  const tasks = await fs.readJson(path.join(baseDataDir, 'tasks.json')).catch(() => []);
  
  console.log('Loaded entity data with counts:');
  console.log(`- Companies: ${companies.length}`);
  console.log(`- Contacts: ${contacts.length}`);
  console.log(`- Deals: ${deals.length}`);
  console.log(`- Tickets: ${tickets.length}`);
  console.log(`- Notes: ${notes.length}`);
  console.log(`- Tasks: ${tasks.length}`);
  
  // Generate all associations following our hierarchy
  console.log('Generating associations based on entity hierarchy...');
  
  const allAssociations = [];
  
  //===============================
  // 1. COMPANY ASSOCIATIONS (highest priority)
  //===============================
  
  // Company-Contact Associations
  contacts.forEach(contact => {
    if (contact.associations && contact.associations.companies) {
      contact.associations.companies.forEach(companyId => {
        const hubspotContactId = mappings.contacts[contact.id];
        const hubspotCompanyId = mappings.companies[companyId];
        
        if (hubspotContactId && hubspotCompanyId) {
          // Company to Contact (company is higher in hierarchy)
          allAssociations.push({
            fromType: 'companies',
            fromId: hubspotCompanyId,
            toType: 'contacts',
            toId: hubspotContactId,
            associationTypeId: ASSOCIATION_TYPES['company-contact'],
            description: `Company ${companyId} to Contact ${contact.id}`
          });
        }
      });
    }
  });
  
  // Company-Deal Associations
  deals.forEach(deal => {
    if (deal.associations && deal.associations.companies) {
      deal.associations.companies.forEach(companyId => {
        const hubspotDealId = mappings.deals[deal.id];
        const hubspotCompanyId = mappings.companies[companyId];
        
        if (hubspotDealId && hubspotCompanyId) {
          // Company to Deal (company is higher in hierarchy)
          allAssociations.push({
            fromType: 'companies',
            fromId: hubspotCompanyId,
            toType: 'deals',
            toId: hubspotDealId,
            associationTypeId: ASSOCIATION_TYPES['company-deal'],
            description: `Company ${companyId} to Deal ${deal.id}`
          });
        }
      });
    }
  });
  
  // Company-Ticket Associations
  tickets.forEach(ticket => {
    if (ticket.associations && ticket.associations.companies) {
      ticket.associations.companies.forEach(companyId => {
        const hubspotTicketId = mappings.tickets[ticket.id];
        const hubspotCompanyId = mappings.companies[companyId];
        
        if (hubspotTicketId && hubspotCompanyId) {
          // Company to Ticket (company is higher in hierarchy)
          allAssociations.push({
            fromType: 'companies',
            fromId: hubspotCompanyId,
            toType: 'tickets',
            toId: hubspotTicketId,
            associationTypeId: ASSOCIATION_TYPES['company-ticket'],
            description: `Company ${companyId} to Ticket ${ticket.id}`
          });
        }
      });
    }
  });
  
  // Company-Note Associations
  notes.forEach(note => {
    if (note.associations && note.associations.companies) {
      note.associations.companies.forEach(companyId => {
        const hubspotNoteId = mappings.notes[note.id];
        const hubspotCompanyId = mappings.companies[companyId];
        
        if (hubspotNoteId && hubspotCompanyId) {
          // Company to Note (company is higher in hierarchy)
          allAssociations.push({
            fromType: 'companies',
            fromId: hubspotCompanyId,
            toType: 'notes',
            toId: hubspotNoteId,
            associationTypeId: ASSOCIATION_TYPES['company-note'],
            description: `Company ${companyId} to Note ${note.id}`
          });
        }
      });
    }
  });
  
  // Company-Task Associations
  tasks.forEach(task => {
    if (task.associations && task.associations.companies) {
      task.associations.companies.forEach(companyId => {
        const hubspotTaskId = mappings.tasks[task.id];
        const hubspotCompanyId = mappings.companies[companyId];
        
        if (hubspotTaskId && hubspotCompanyId) {
          // Company to Task (company is higher in hierarchy)
          allAssociations.push({
            fromType: 'companies',
            fromId: hubspotCompanyId,
            toType: 'tasks',
            toId: hubspotTaskId,
            associationTypeId: ASSOCIATION_TYPES['company-task'],
            description: `Company ${companyId} to Task ${task.id}`
          });
        }
      });
    }
  });
  
  //===============================
  // 2. CONTACT ASSOCIATIONS (second highest priority)
  //===============================
  
  // Contact-Deal Associations
  deals.forEach(deal => {
    if (deal.associations && deal.associations.contacts) {
      deal.associations.contacts.forEach(contactId => {
        const hubspotDealId = mappings.deals[deal.id];
        const hubspotContactId = mappings.contacts[contactId];
        
        if (hubspotDealId && hubspotContactId) {
          // Contact to Deal (contact is higher in hierarchy than deal)
          allAssociations.push({
            fromType: 'contacts',
            fromId: hubspotContactId,
            toType: 'deals',
            toId: hubspotDealId,
            associationTypeId: ASSOCIATION_TYPES['contact-deal'],
            description: `Contact ${contactId} to Deal ${deal.id}`
          });
        }
      });
    }
  });
  
  // Contact-Ticket Associations
  tickets.forEach(ticket => {
    if (ticket.associations && ticket.associations.contacts) {
      ticket.associations.contacts.forEach(contactId => {
        const hubspotTicketId = mappings.tickets[ticket.id];
        const hubspotContactId = mappings.contacts[contactId];
        
        if (hubspotTicketId && hubspotContactId) {
          // Contact to Ticket (contact is higher in hierarchy)
          allAssociations.push({
            fromType: 'contacts',
            fromId: hubspotContactId,
            toType: 'tickets',
            toId: hubspotTicketId,
            associationTypeId: ASSOCIATION_TYPES['contact-ticket'],
            description: `Contact ${contactId} to Ticket ${ticket.id}`
          });
        }
      });
    }
  });
  
  // Contact-Note Associations
  notes.forEach(note => {
    if (note.associations && note.associations.contacts) {
      note.associations.contacts.forEach(contactId => {
        const hubspotNoteId = mappings.notes[note.id];
        const hubspotContactId = mappings.contacts[contactId];
        
        if (hubspotNoteId && hubspotContactId) {
          // Contact to Note (contact is higher in hierarchy)
          allAssociations.push({
            fromType: 'contacts',
            fromId: hubspotContactId,
            toType: 'notes',
            toId: hubspotNoteId,
            associationTypeId: ASSOCIATION_TYPES['contact-note'],
            description: `Contact ${contactId} to Note ${note.id}`
          });
        }
      });
    }
  });
  
  // Contact-Task Associations
  tasks.forEach(task => {
    if (task.associations && task.associations.contacts) {
      task.associations.contacts.forEach(contactId => {
        const hubspotTaskId = mappings.tasks[task.id];
        const hubspotContactId = mappings.contacts[contactId];
        
        if (hubspotTaskId && hubspotContactId) {
          // Contact to Task (contact is higher in hierarchy)
          allAssociations.push({
            fromType: 'contacts',
            fromId: hubspotContactId,
            toType: 'tasks',
            toId: hubspotTaskId,
            associationTypeId: ASSOCIATION_TYPES['contact-task'],
            description: `Contact ${contactId} to Task ${task.id}`
          });
        }
      });
    }
  });
  
  //===============================
  // 3. DEAL ASSOCIATIONS (third highest priority)
  //===============================
  
  // Deal-Ticket Associations
  tickets.forEach(ticket => {
    if (ticket.associations && ticket.associations.deals) {
      ticket.associations.deals.forEach(dealId => {
        const hubspotTicketId = mappings.tickets[ticket.id];
        const hubspotDealId = mappings.deals[dealId];
        
        if (hubspotTicketId && hubspotDealId) {
          // Deal to Ticket (deal is higher in hierarchy)
          allAssociations.push({
            fromType: 'deals',
            fromId: hubspotDealId,
            toType: 'tickets',
            toId: hubspotTicketId,
            associationTypeId: ASSOCIATION_TYPES['deal-ticket'],
            description: `Deal ${dealId} to Ticket ${ticket.id}`
          });
        }
      });
    }
  });
  
  // Deal-Note Associations
  notes.forEach(note => {
    if (note.associations && note.associations.deals) {
      note.associations.deals.forEach(dealId => {
        const hubspotNoteId = mappings.notes[note.id];
        const hubspotDealId = mappings.deals[dealId];
        
        if (hubspotNoteId && hubspotDealId) {
          // Deal to Note (deal is higher in hierarchy)
          allAssociations.push({
            fromType: 'deals',
            fromId: hubspotDealId,
            toType: 'notes',
            toId: hubspotNoteId,
            associationTypeId: ASSOCIATION_TYPES['deal-note'],
            description: `Deal ${dealId} to Note ${note.id}`
          });
        }
      });
    }
  });
  
  // Deal-Task Associations
  tasks.forEach(task => {
    if (task.associations && task.associations.deals) {
      task.associations.deals.forEach(dealId => {
        const hubspotTaskId = mappings.tasks[task.id];
        const hubspotDealId = mappings.deals[dealId];
        
        if (hubspotTaskId && hubspotDealId) {
          // Deal to Task (deal is higher in hierarchy)
          allAssociations.push({
            fromType: 'deals',
            fromId: hubspotDealId,
            toType: 'tasks',
            toId: hubspotTaskId,
            associationTypeId: ASSOCIATION_TYPES['deal-task'],
            description: `Deal ${dealId} to Task ${task.id}`
          });
        }
      });
    }
  });
  
  //===============================
  // 4. TICKET ASSOCIATIONS (fourth highest priority)
  //===============================
  
  // Ticket-Note Associations
  notes.forEach(note => {
    if (note.associations && note.associations.tickets) {
      note.associations.tickets.forEach(ticketId => {
        const hubspotNoteId = mappings.notes[note.id];
        const hubspotTicketId = mappings.tickets[ticketId];
        
        if (hubspotNoteId && hubspotTicketId) {
          // Ticket to Note (ticket is higher in hierarchy)
          allAssociations.push({
            fromType: 'tickets',
            fromId: hubspotTicketId,
            toType: 'notes',
            toId: hubspotNoteId,
            associationTypeId: ASSOCIATION_TYPES['ticket-note'],
            description: `Ticket ${ticketId} to Note ${note.id}`
          });
        }
      });
    }
  });
  
  // Ticket-Task Associations
  tasks.forEach(task => {
    if (task.associations && task.associations.tickets) {
      task.associations.tickets.forEach(ticketId => {
        const hubspotTaskId = mappings.tasks[task.id];
        const hubspotTicketId = mappings.tickets[ticketId];
        
        if (hubspotTaskId && hubspotTicketId) {
          // Ticket to Task (ticket is higher in hierarchy)
          allAssociations.push({
            fromType: 'tickets',
            fromId: hubspotTicketId,
            toType: 'tasks',
            toId: hubspotTaskId,
            associationTypeId: ASSOCIATION_TYPES['ticket-task'],
            description: `Ticket ${ticketId} to Task ${task.id}`
          });
        }
      });
    }
  });
  
  // Write the associations to a file
  await fs.writeJson(associationsOutputPath, {
    metadata: {
      organizationId,
      generatedAt: new Date().toISOString(),
      counts: {
        total: allAssociations.length,
        byType: {
          companyContact: allAssociations.filter(a => 
            a.fromType === 'companies' && a.toType === 'contacts'
          ).length,
          companyDeal: allAssociations.filter(a => 
            a.fromType === 'companies' && a.toType === 'deals'
          ).length,
          companyTicket: allAssociations.filter(a => 
            a.fromType === 'companies' && a.toType === 'tickets'
          ).length,
          companyNote: allAssociations.filter(a => 
            a.fromType === 'companies' && a.toType === 'notes'
          ).length,
          companyTask: allAssociations.filter(a => 
            a.fromType === 'companies' && a.toType === 'tasks'
          ).length,
          contactDeal: allAssociations.filter(a => 
            a.fromType === 'contacts' && a.toType === 'deals'
          ).length,
          contactTicket: allAssociations.filter(a => 
            a.fromType === 'contacts' && a.toType === 'tickets'
          ).length,
          contactNote: allAssociations.filter(a => 
            a.fromType === 'contacts' && a.toType === 'notes'
          ).length,
          contactTask: allAssociations.filter(a => 
            a.fromType === 'contacts' && a.toType === 'tasks'
          ).length,
          dealTicket: allAssociations.filter(a => 
            a.fromType === 'deals' && a.toType === 'tickets'
          ).length,
          dealNote: allAssociations.filter(a => 
            a.fromType === 'deals' && a.toType === 'notes'
          ).length,
          dealTask: allAssociations.filter(a => 
            a.fromType === 'deals' && a.toType === 'tasks'
          ).length,
          ticketNote: allAssociations.filter(a => 
            a.fromType === 'tickets' && a.toType === 'notes'
          ).length,
          ticketTask: allAssociations.filter(a => 
            a.fromType === 'tickets' && a.toType === 'tasks'
          ).length
        }
      }
    },
    associations: allAssociations
  }, { spaces: 2 });
  
  console.log(`Exported ${allAssociations.length} associations to ${associationsOutputPath}`);
  console.log("Now you can run 'create-associations.ts' to create these associations in HubSpot");
}

// Execute the script if run directly
if (require.main === module) {
  const organizationId = process.argv[2];
  
  if (!organizationId) {
    console.error('Error: Organization ID is required.');
    console.error('Usage: bun run seeders/hubspot/export-associations.ts <organization-id>');
    process.exit(1);
  }
  
  exportAssociations(organizationId)
    .catch(err => {
      console.error('Error exporting associations:', err);
      process.exit(1);
    });
}

export { exportAssociations };