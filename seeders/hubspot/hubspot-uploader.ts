/**
 * HubSpot Data Uploader
 * 
 * This file implements functionality to upload generated data to HubSpot.
 * It handles creating companies, contacts, deals, and their associations.
 * It also provides cleanup functionality to clear previous test data.
 */

import * as dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';
import * as fs from 'fs-extra';
import * as path from 'path';
import { RateLimiter } from './rate-limiter';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
console.log('Loaded .env from:', path.resolve(process.cwd(), '.env'));
console.log('Current working directory:', process.cwd());

export interface UploaderOptions {
  organizationId: string;
  baseDir?: string;
  batchSize?: number;
  rateLimitDelay?: number;
  cleanupBeforeUpload?: boolean;
}

export class HubSpotUploader {
  private client: Client;
  private organizationId: string;
  private baseDir: string;
  private batchSize: number;
  private rateLimitDelay: number;
  private cleanupBeforeUpload: boolean;
  private rateLimiter: RateLimiter;
  
  // Maps to track HubSpot IDs for created entities
  private companyIdMap: Map<string, string> = new Map();
  private contactIdMap: Map<string, string> = new Map();
  private dealIdMap: Map<string, string> = new Map();
  private ticketIdMap: Map<string, string> = new Map();
  private noteIdMap: Map<string, string> = new Map();
  private taskIdMap: Map<string, string> = new Map();

  constructor(options: UploaderOptions) {
    this.organizationId = options.organizationId;
    this.baseDir = options.baseDir || path.join(__dirname, 'data');
    this.batchSize = options.batchSize || 10;  // Batch size for efficient processing
    this.rateLimitDelay = options.rateLimitDelay || 1000;  // Kept for backward compatibility
    this.cleanupBeforeUpload = options.cleanupBeforeUpload !== undefined ? options.cleanupBeforeUpload : true;
    
    // Initialize rate limiter with HubSpot's private app limits
    this.rateLimiter = new RateLimiter({
      debugMode: true
    });
    
    // Initialize HubSpot client
    const token = process.env.HUBSPOT_TEST_PAT;
    if (!token) {
      console.error('ERROR: HUBSPOT_TEST_PAT environment variable not found.');
      console.error('Please ensure your .env file contains a valid HubSpot Personal Access Token.');
      process.exit(1);
    }
    
    console.log('Using HubSpot token:', token.substring(0, 10) + '...');
    
    this.client = new Client({ 
      accessToken: token 
    });
  }

  /**
   * Load data from files
   */
  private async loadData() {
    const orgDir = path.join(this.baseDir, this.organizationId);
    const baseDir = path.join(orgDir, 'base');
    
    // Load companies
    const companiesPath = path.join(baseDir, 'companies.json');
    const companies = fs.existsSync(companiesPath) 
      ? await fs.readJson(companiesPath) 
      : [];
    
    // Load contacts
    const contactsPath = path.join(baseDir, 'contacts.json');
    const contacts = fs.existsSync(contactsPath) 
      ? await fs.readJson(contactsPath) 
      : [];
    
    // Load deals
    const dealsPath = path.join(baseDir, 'deals.json');
    const deals = fs.existsSync(dealsPath) 
      ? await fs.readJson(dealsPath) 
      : [];
      
    // Load tickets
    const ticketsPath = path.join(baseDir, 'tickets.json');
    const tickets = fs.existsSync(ticketsPath) 
      ? await fs.readJson(ticketsPath) 
      : [];
      
    // Load notes
    const notesPath = path.join(baseDir, 'notes.json');
    const notes = fs.existsSync(notesPath) 
      ? await fs.readJson(notesPath) 
      : [];
      
    // Load tasks
    const tasksPath = path.join(baseDir, 'tasks.json');
    const tasks = fs.existsSync(tasksPath) 
      ? await fs.readJson(tasksPath) 
      : [];
      
    return { companies, contacts, deals, tickets, notes, tasks };
  }
  
  /**
   * Clean up existing test data
   */
  private async cleanup() {
    console.log('Starting cleanup of existing test data...');
    
    try {
      // Clean up notes and tasks first (engagements)
      await this.cleanupNotes();
      await this.cleanupTasks();
      
      // Clean up deals and tickets (due to associations)
      await this.cleanupDeals();
      await this.cleanupTickets();
      
      // Clean up contacts
      await this.cleanupContacts();
      
      // Clean up companies
      await this.cleanupCompanies();
      
      console.log('Cleanup complete.');
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
  
  /**
   * Clean up existing deals
   */
  private async cleanupDeals() {
    console.log('Cleaning up deals...');
    let deletedCount = 0;
    
    try {
      // Get all deals
      const deals = await this.getAllRecords('deals');
      console.log(`Found ${deals.length} deals to clean up.`);
      
      // Process in batches
      for (let i = 0; i < deals.length; i += this.batchSize) {
        const batch = deals.slice(i, i + this.batchSize);
        
        // Delete each deal in the batch
        await Promise.all(
          batch.map(async (deal) => {
            try {
              await this.client.crm.deals.basicApi.archive(deal.id);
              deletedCount++;
              return true;
            } catch (error) {
              console.error(`Error deleting deal ${deal.id}:`, error);
              return false;
            }
          })
        );
        
        // Rate limiting delay
        if (i + this.batchSize < deals.length) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }
      
      console.log(`Deleted ${deletedCount} deals.`);
    } catch (error) {
      console.error('Error cleaning up deals:', error);
    }
  }
  
  /**
   * Clean up existing contacts
   */
  private async cleanupContacts() {
    console.log('Cleaning up contacts...');
    let deletedCount = 0;
    
    try {
      // Get all contacts
      const contacts = await this.getAllRecords('contacts');
      console.log(`Found ${contacts.length} contacts to clean up.`);
      
      // Process in batches
      for (let i = 0; i < contacts.length; i += this.batchSize) {
        const batch = contacts.slice(i, i + this.batchSize);
        
        // Delete each contact in the batch
        await Promise.all(
          batch.map(async (contact) => {
            try {
              await this.client.crm.contacts.basicApi.archive(contact.id);
              deletedCount++;
              return true;
            } catch (error) {
              console.error(`Error deleting contact ${contact.id}:`, error);
              return false;
            }
          })
        );
        
        // Rate limiting delay
        if (i + this.batchSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }
      
      console.log(`Deleted ${deletedCount} contacts.`);
    } catch (error) {
      console.error('Error cleaning up contacts:', error);
    }
  }
  
  /**
   * Clean up existing notes
   */
  private async cleanupNotes() {
    console.log('Cleaning up notes...');
    let deletedCount = 0;
    
    try {
      // Get all notes
      const notes = await this.getAllRecords('notes');
      console.log(`Found ${notes.length} notes to clean up.`);
      
      // Process in batches
      for (let i = 0; i < notes.length; i += this.batchSize) {
        const batch = notes.slice(i, i + this.batchSize);
        
        // Delete each note in the batch
        await Promise.all(
          batch.map(async (note) => {
            try {
              await this.client.crm.objects.notes.basicApi.archive(note.id);
              deletedCount++;
              return true;
            } catch (error) {
              console.error(`Error deleting note ${note.id}:`, error);
              return false;
            }
          })
        );
        
        // Rate limiting delay
        if (i + this.batchSize < notes.length) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }
      
      console.log(`Deleted ${deletedCount} notes.`);
    } catch (error) {
      console.error('Error cleaning up notes:', error);
    }
  }

  /**
   * Clean up existing tasks
   */
  private async cleanupTasks() {
    console.log('Cleaning up tasks...');
    let deletedCount = 0;
    
    try {
      // Get all tasks
      const tasks = await this.getAllRecords('tasks');
      console.log(`Found ${tasks.length} tasks to clean up.`);
      
      // Process in batches
      for (let i = 0; i < tasks.length; i += this.batchSize) {
        const batch = tasks.slice(i, i + this.batchSize);
        
        // Delete each task in the batch
        await Promise.all(
          batch.map(async (task) => {
            try {
              await this.client.crm.objects.tasks.basicApi.archive(task.id);
              deletedCount++;
              return true;
            } catch (error) {
              console.error(`Error deleting task ${task.id}:`, error);
              return false;
            }
          })
        );
        
        // Rate limiting delay
        if (i + this.batchSize < tasks.length) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }
      
      console.log(`Deleted ${deletedCount} tasks.`);
    } catch (error) {
      console.error('Error cleaning up tasks:', error);
    }
  }

  /**
   * Clean up existing tickets
   */
  private async cleanupTickets() {
    console.log('Cleaning up tickets...');
    let deletedCount = 0;
    
    try {
      // Get all tickets
      const tickets = await this.getAllRecords('tickets');
      console.log(`Found ${tickets.length} tickets to clean up.`);
      
      // Process in batches
      for (let i = 0; i < tickets.length; i += this.batchSize) {
        const batch = tickets.slice(i, i + this.batchSize);
        
        // Delete each ticket in the batch
        await Promise.all(
          batch.map(async (ticket) => {
            try {
              await this.client.crm.tickets.basicApi.archive(ticket.id);
              deletedCount++;
              return true;
            } catch (error) {
              console.error(`Error deleting ticket ${ticket.id}:`, error);
              return false;
            }
          })
        );
        
        // Rate limiting delay
        if (i + this.batchSize < tickets.length) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }
      
      console.log(`Deleted ${deletedCount} tickets.`);
    } catch (error) {
      console.error('Error cleaning up tickets:', error);
    }
  }

  /**
   * Clean up existing companies
   */
  private async cleanupCompanies() {
    console.log('Cleaning up companies...');
    let deletedCount = 0;
    
    try {
      // Get all companies
      const companies = await this.getAllRecords('companies');
      console.log(`Found ${companies.length} companies to clean up.`);
      
      // Process in batches
      for (let i = 0; i < companies.length; i += this.batchSize) {
        const batch = companies.slice(i, i + this.batchSize);
        
        // Delete each company in the batch
        await Promise.all(
          batch.map(async (company) => {
            try {
              await this.client.crm.companies.basicApi.archive(company.id);
              deletedCount++;
              return true;
            } catch (error) {
              console.error(`Error deleting company ${company.id}:`, error);
              return false;
            }
          })
        );
        
        // Rate limiting delay
        if (i + this.batchSize < companies.length) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }
      }
      
      console.log(`Deleted ${deletedCount} companies.`);
    } catch (error) {
      console.error('Error cleaning up companies:', error);
    }
  }
  
  /**
   * Get all records of a specific type
   */
  private async getAllRecords(objectType: 'contacts' | 'companies' | 'deals' | 'tickets' | 'notes' | 'tasks') {
    let allRecords: any[] = [];
    let after: string | undefined;
    const limit = 100;  // Maximum allowed by HubSpot API
    
    do {
      let response;
      
      // Get page of records based on object type
      switch (objectType) {
        case 'contacts':
          response = await this.client.crm.contacts.basicApi.getPage(limit, after);
          break;
        case 'companies':
          response = await this.client.crm.companies.basicApi.getPage(limit, after);
          break;
        case 'deals':
          response = await this.client.crm.deals.basicApi.getPage(limit, after);
          break;
        case 'tickets':
          response = await this.client.crm.tickets.basicApi.getPage(limit, after);
          break;
        case 'notes':
          response = await this.client.crm.objects.notes.basicApi.getPage(limit, after);
          break;
        case 'tasks':
          response = await this.client.crm.objects.tasks.basicApi.getPage(limit, after);
          break;
      }
      
      // Add results to the list
      allRecords = allRecords.concat(response.results);
      
      // Get pagination token for next page
      after = response.paging?.next?.after;
      
      // Rate limiting delay between pages
      if (after) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
    } while (after);
    
    return allRecords;
  }
  
  /**
   * Upload companies to HubSpot
   */
  private async uploadCompanies(companies: any[]) {
    console.log(`Uploading ${companies.length} companies to HubSpot...`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each company that respects rate limits
    const processCompany = async (company) => {
      try {
        // Map our company data to HubSpot format
        // All properties should be compatible with HubSpot's API now that we've
        // registered our custom properties
        const hubspotCompany = {
          properties: company.properties
        };
        
        // Create the company in HubSpot (this will be rate limited)
        const response = await this.rateLimiter.schedule(() => 
          this.client.crm.companies.basicApi.create(hubspotCompany)
        );
        
        // Store the mapping between our ID and HubSpot's ID
        this.companyIdMap.set(company.id, response.id);
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 5 === 0 || processedCount === companies.length) {
          console.log(`Uploaded ${processedCount}/${companies.length} companies (${successCount} successful).`);
        }
        
        return {
          id: company.id,
          hubspotId: response.id,
          success: true
        };
      } catch (error) {
        // Log detailed error information to help troubleshoot property-related issues
        console.error(`Error creating company ${company.id}:`, error);
        if (error.response?.body) {
          console.error('Error details:', JSON.stringify(error.response.body, null, 2));
        }
        processedCount++;
        
        return {
          id: company.id,
          success: false,
          error
        };
      }
    };
    
    // Process companies in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < companies.length; i += this.batchSize) {
      const batch = companies.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processCompany));
    }
    
    console.log('Company upload complete.');
  }
  
  /**
   * Upload contacts to HubSpot
   */
  private async uploadContacts(contacts: any[]) {
    console.log(`Uploading ${contacts.length} contacts to HubSpot...`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each contact that respects rate limits
    const processContact = async (contact) => {
      try {
        // Map our contact data to HubSpot format
        // All properties should be compatible with HubSpot's API now that we've
        // registered our custom properties
        const hubspotContact = {
          properties: contact.properties
        };
        
        // Create the contact in HubSpot (this will be rate limited)
        const response = await this.rateLimiter.schedule(() => 
          this.client.crm.contacts.basicApi.create(hubspotContact)
        );
        
        // Store the mapping between our ID and HubSpot's ID
        this.contactIdMap.set(contact.id, response.id);
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === contacts.length) {
          console.log(`Uploaded ${processedCount}/${contacts.length} contacts (${successCount} successful).`);
        }
        
        return {
          id: contact.id,
          hubspotId: response.id,
          success: true
        };
      } catch (error) {
        // Log detailed error information to help troubleshoot property-related issues
        console.error(`Error creating contact ${contact.id}:`, error);
        if (error.response?.body) {
          console.error('Error details:', JSON.stringify(error.response.body, null, 2));
        }
        processedCount++;
        
        return {
          id: contact.id,
          success: false,
          error
        };
      }
    };
    
    // Process contacts in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < contacts.length; i += this.batchSize) {
      const batch = contacts.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processContact));
    }
    
    console.log('Contact upload complete.');
  }
  
  /**
   * Upload deals to HubSpot
   */
  private async uploadDeals(deals: any[]) {
    console.log(`Uploading ${deals.length} deals to HubSpot...`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each deal that respects rate limits
    const processDeal = async (deal) => {
      try {
        // Ensure the custom properties exist in HubSpot before attempting to create the deal
        // We've already run setup-properties.ts, but we're keeping this safeguard here
        
        // Map our deal data to HubSpot format
        // All properties should be compatible with HubSpot's API now that we've
        // registered our custom properties
        const hubspotDeal = {
          properties: deal.properties
        };
        
        // Create the deal in HubSpot (this will be rate limited)
        const response = await this.rateLimiter.schedule(() => 
          this.client.crm.deals.basicApi.create(hubspotDeal)
        );
        
        // Store the mapping between our ID and HubSpot's ID
        this.dealIdMap.set(deal.id, response.id);
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === deals.length) {
          console.log(`Uploaded ${processedCount}/${deals.length} deals (${successCount} successful).`);
        }
        
        return {
          id: deal.id,
          hubspotId: response.id,
          success: true
        };
      } catch (error) {
        // Log detailed error information to help troubleshoot property-related issues
        console.error(`Error creating deal ${deal.id}:`, error);
        if (error.response?.body) {
          console.error('Error details:', JSON.stringify(error.response.body, null, 2));
        }
        processedCount++;
        
        return {
          id: deal.id,
          success: false,
          error
        };
      }
    };
    
    // Process deals in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < deals.length; i += this.batchSize) {
      const batch = deals.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processDeal));
    }
    
    console.log('Deal upload complete.');
  }
  
  /**
   * Upload tickets to HubSpot
   */
  private async uploadTickets(tickets: any[]) {
    console.log(`Uploading ${tickets.length} tickets to HubSpot...`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each ticket that respects rate limits
    const processTicket = async (ticket) => {
      try {
        // Map our ticket data to HubSpot format
        const hubspotTicket = {
          properties: ticket.properties
        };
        
        // Create the ticket in HubSpot (this will be rate limited)
        const response = await this.rateLimiter.schedule(() => 
          this.client.crm.tickets.basicApi.create(hubspotTicket)
        );
        
        // Store the mapping between our ID and HubSpot's ID
        this.ticketIdMap.set(ticket.id, response.id);
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 5 === 0 || processedCount === tickets.length) {
          console.log(`Uploaded ${processedCount}/${tickets.length} tickets (${successCount} successful).`);
        }
        
        return { success: true, id: response.id };
      } catch (error) {
        console.error(`Error creating ticket:`, error);
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process tickets in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < tickets.length; i += this.batchSize) {
      const batch = tickets.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processTicket));
    }
    
    console.log('Ticket upload complete.');
  }
  
  /**
   * Upload notes to HubSpot
   */
  private async uploadNotes(notes: any[]) {
    console.log(`Uploading ${notes.length} notes to HubSpot...`);
    let successCount = 0;
    let processedCount = 0;
    
    console.log("NOTE: For CRM notes to appear in HubSpot, they require associations. We'll create the notes first, then add associations.");
    
    // Create a processor function for each note that respects rate limits
    const processNote = async (note) => {
      try {
        // Get associated entities
        const companyIds = note.associations.companies || [];
        const contactIds = note.associations.contacts || [];
        const dealIds = note.associations.deals || [];
        const ticketIds = note.associations.tickets || [];
        
        // Map HubSpot IDs 
        const hubspotCompanyIds = companyIds
          .map(id => this.companyIdMap.get(id))
          .filter(id => id !== undefined);
          
        const hubspotContactIds = contactIds
          .map(id => this.contactIdMap.get(id))
          .filter(id => id !== undefined);
          
        const hubspotDealIds = dealIds
          .map(id => this.dealIdMap.get(id))
          .filter(id => id !== undefined);
          
        const hubspotTicketIds = ticketIds
          .map(id => this.ticketIdMap.get(id))
          .filter(id => id !== undefined);
        
        // Simplified note data for HubSpot with only the required properties
        const hubspotNote = {
          properties: {
            hs_note_body: note.properties.hs_note_body,
            hs_timestamp: note.properties.hs_timestamp
          }
        };
        
        // Create the note in HubSpot (this will be rate limited)
        const response = await this.rateLimiter.schedule(() => 
          this.client.crm.objects.notes.basicApi.create(hubspotNote)
        );
        
        console.log(`Note created with ID: ${response.id}`);
        
        // Store the mapping between our ID and HubSpot's ID
        this.noteIdMap.set(note.id, response.id);
        successCount++;
        
        // Create associations immediately after note creation
        try {
          const associationPromises = [];
          
          // Company associations
          for (const companyId of hubspotCompanyIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'notes',
                  response.id,
                  'companies',
                  companyId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Contact associations
          for (const contactId of hubspotContactIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'notes',
                  response.id,
                  'contacts',
                  contactId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Deal associations
          for (const dealId of hubspotDealIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'notes',
                  response.id,
                  'deals',
                  dealId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Ticket associations
          for (const ticketId of hubspotTicketIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'notes',
                  response.id,
                  'tickets',
                  ticketId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Wait for all associations to be created
          await Promise.all(associationPromises);
          console.log(`Created ${associationPromises.length} associations for note ${response.id}`);
        } catch (assocError) {
          console.error(`Error creating note associations:`, assocError);
        }
        
        // Log progress
        processedCount++;
        if (processedCount % 3 === 0 || processedCount === notes.length) {
          console.log(`Uploaded ${processedCount}/${notes.length} notes (${successCount} successful).`);
        }
        
        return { success: true, id: response.id };
      } catch (error) {
        console.error(`Error creating note:`, error);
        if (error.response && error.response.body) {
          console.error(`Error details: ${JSON.stringify(error.response.body)}`);
        }
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process notes one at a time to ensure associations work properly
    for (const note of notes) {
      await processNote(note);
      // Small delay between notes to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Note upload complete.');
  }
  
  /**
   * Upload tasks to HubSpot
   */
  private async uploadTasks(tasks: any[]) {
    console.log(`Uploading ${tasks.length} tasks to HubSpot...`);
    let successCount = 0;
    let processedCount = 0;
    
    console.log("NOTE: For CRM tasks to appear in HubSpot, they require associations. We'll create the tasks first, then add associations.");
    
    // Create a processor function for each task that respects rate limits
    const processTask = async (task) => {
      try {
        // Get associated entities
        const companyIds = task.associations.companies || [];
        const contactIds = task.associations.contacts || [];
        const dealIds = task.associations.deals || [];
        const ticketIds = task.associations.tickets || [];
        
        // Map HubSpot IDs 
        const hubspotCompanyIds = companyIds
          .map(id => this.companyIdMap.get(id))
          .filter(id => id !== undefined);
          
        const hubspotContactIds = contactIds
          .map(id => this.contactIdMap.get(id))
          .filter(id => id !== undefined);
          
        const hubspotDealIds = dealIds
          .map(id => this.dealIdMap.get(id))
          .filter(id => id !== undefined);
          
        const hubspotTicketIds = ticketIds
          .map(id => this.ticketIdMap.get(id))
          .filter(id => id !== undefined);
        
        // Simplified task data for HubSpot with only the required properties
        const hubspotTask = {
          properties: {
            hs_task_subject: task.properties.hs_task_subject,
            hs_task_body: task.properties.hs_task_body,
            hs_task_status: task.properties.hs_task_status,
            hs_task_priority: task.properties.hs_task_priority,
            hs_task_type: task.properties.hs_task_type,
            hs_timestamp: task.properties.hs_timestamp
            // Removed neuco properties for now since they could be causing issues
          }
        };
        
        // Create the task in HubSpot (this will be rate limited)
        const response = await this.rateLimiter.schedule(() => 
          this.client.crm.objects.tasks.basicApi.create(hubspotTask)
        );
        
        console.log(`Task created with ID: ${response.id}`);
        
        // Store the mapping between our ID and HubSpot's ID
        this.taskIdMap.set(task.id, response.id);
        successCount++;
        
        // Create associations immediately after task creation
        try {
          const associationPromises = [];
          
          // Company associations
          for (const companyId of hubspotCompanyIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'tasks',
                  response.id,
                  'companies',
                  companyId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Contact associations
          for (const contactId of hubspotContactIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'tasks',
                  response.id,
                  'contacts',
                  contactId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Deal associations
          for (const dealId of hubspotDealIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'tasks',
                  response.id,
                  'deals',
                  dealId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Ticket associations
          for (const ticketId of hubspotTicketIds) {
            associationPromises.push(
              this.rateLimiter.schedule(() => 
                this.client.crm.associations.v4.basicApi.create(
                  'tasks',
                  response.id,
                  'tickets',
                  ticketId,
                  [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
                )
              )
            );
          }
          
          // Wait for all associations to be created
          await Promise.all(associationPromises);
          console.log(`Created ${associationPromises.length} associations for task ${response.id}`);
        } catch (assocError) {
          console.error(`Error creating task associations:`, assocError);
        }
        
        // Log progress
        processedCount++;
        if (processedCount % 3 === 0 || processedCount === tasks.length) {
          console.log(`Uploaded ${processedCount}/${tasks.length} tasks (${successCount} successful).`);
        }
        
        return { success: true, id: response.id };
      } catch (error) {
        console.error(`Error creating task:`, error);
        if (error.response && error.response.body) {
          console.error(`Error details: ${JSON.stringify(error.response.body)}`);
        }
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process tasks one at a time to ensure associations work properly
    for (const task of tasks) {
      await processTask(task);
      // Small delay between tasks to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Task upload complete.');
  }
  
  /**
   * Create associations between tickets and companies/contacts
   */
  private async createTicketAssociations(tickets: any[]) {
    console.log('Creating ticket associations...');
    
    const allAssociations = [];
    
    // Collect all associations
    for (const ticket of tickets) {
      if (ticket.associations) {
        // Company associations
        if (ticket.associations.companies) {
          for (const companyId of ticket.associations.companies) {
            const hubspotTicketId = this.ticketIdMap.get(ticket.id);
            const hubspotCompanyId = this.companyIdMap.get(companyId);
            
            if (hubspotTicketId && hubspotCompanyId) {
              allAssociations.push({
                ticketId: hubspotTicketId,
                objectId: hubspotCompanyId,
                type: 'company',
                typeId: 25 // HubSpot association type for ticket-to-company
              });
            }
          }
        }
        
        // Contact associations
        if (ticket.associations.contacts) {
          for (const contactId of ticket.associations.contacts) {
            const hubspotTicketId = this.ticketIdMap.get(ticket.id);
            const hubspotContactId = this.contactIdMap.get(contactId);
            
            if (hubspotTicketId && hubspotContactId) {
              allAssociations.push({
                ticketId: hubspotTicketId,
                objectId: hubspotContactId,
                type: 'contact',
                typeId: 16 // HubSpot association type for ticket-to-contact
              });
            }
          }
        }
      }
    }
    
    console.log(`Found ${allAssociations.length} ticket associations to create.`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each association that respects rate limits
    const processAssociation = async (assoc) => {
      try {
        // Create the association in HubSpot (this will be rate limited)
        // For ticket-company associations, we need to reverse the direction based on our testing
        if (assoc.type === 'company') {
          // For companies, create association from company to ticket (reversed)
          console.log(`Using reversed direction for ticket-company association (company→ticket)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'companies',
              String(assoc.objectId),
              'tickets',
              String(assoc.ticketId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }]
            )
          , { requestTimeoutMs: 10000 });
        } else {
          // For contacts, use the normal direction
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'tickets',
              String(assoc.ticketId),
              'contacts',
              String(assoc.objectId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }]
            )
          , { requestTimeoutMs: 10000 });
        }
        
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === allAssociations.length) {
          console.log(`Created ${processedCount}/${allAssociations.length} ticket associations (${successCount} successful).`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Error creating ticket-${assoc.type} association:`, error);
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process associations in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < allAssociations.length; i += this.batchSize) {
      const batch = allAssociations.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processAssociation));
    }
    
    console.log(`Created ${successCount}/${allAssociations.length} ticket associations.`);
    console.log('Ticket associations complete.');
  }
  
  /**
   * Create associations between notes and other objects (companies, contacts, deals, tickets)
   */
  private async createNoteAssociations(notes: any[]) {
    console.log('Creating note associations...');
    
    const allAssociations = [];
    
    // Collect all associations
    for (const note of notes) {
      if (note.associations) {
        // Company associations
        if (note.associations.companies) {
          for (const companyId of note.associations.companies) {
            const hubspotNoteId = this.noteIdMap.get(note.id);
            const hubspotCompanyId = this.companyIdMap.get(companyId);
            
            if (hubspotNoteId && hubspotCompanyId) {
              allAssociations.push({
                noteId: hubspotNoteId,
                objectId: hubspotCompanyId,
                objectType: 'companies',
                associationTypeId: 1 // Standard association for note-to-company
              });
            }
          }
        }
        
        // Contact associations
        if (note.associations.contacts) {
          for (const contactId of note.associations.contacts) {
            const hubspotNoteId = this.noteIdMap.get(note.id);
            const hubspotContactId = this.contactIdMap.get(contactId);
            
            if (hubspotNoteId && hubspotContactId) {
              allAssociations.push({
                noteId: hubspotNoteId,
                objectId: hubspotContactId,
                objectType: 'contacts',
                associationTypeId: 1 // Standard association for note-to-contact
              });
            }
          }
        }
        
        // Deal associations
        if (note.associations.deals) {
          for (const dealId of note.associations.deals) {
            const hubspotNoteId = this.noteIdMap.get(note.id);
            const hubspotDealId = this.dealIdMap.get(dealId);
            
            if (hubspotNoteId && hubspotDealId) {
              allAssociations.push({
                noteId: hubspotNoteId,
                objectId: hubspotDealId,
                objectType: 'deals',
                associationTypeId: 1 // Standard association for note-to-deal
              });
            }
          }
        }
        
        // Ticket associations
        if (note.associations.tickets) {
          for (const ticketId of note.associations.tickets) {
            const hubspotNoteId = this.noteIdMap.get(note.id);
            const hubspotTicketId = this.ticketIdMap.get(ticketId);
            
            if (hubspotNoteId && hubspotTicketId) {
              allAssociations.push({
                noteId: hubspotNoteId,
                objectId: hubspotTicketId,
                objectType: 'tickets',
                associationTypeId: 1 // Standard association for note-to-ticket
              });
            }
          }
        }
      }
    }
    
    console.log(`Found ${allAssociations.length} note associations to create.`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each association that respects rate limits
    const processAssociation = async (assoc) => {
      try {
        // Debug the association parameters
        console.log(`DEBUG: Creating note association - Note ID: ${assoc.noteId}, Object Type: ${assoc.objectType}, Object ID: ${assoc.objectId}`);
        
        // Validate the IDs before attempting to create the association
        const validContactIds = Array.from(this.contactIdMap.values());
        const validCompanyIds = Array.from(this.companyIdMap.values());
        const validDealIds = Array.from(this.dealIdMap.values());
        const validTicketIds = Array.from(this.ticketIdMap.values());
        
        let validObjectId = false;
        if (assoc.objectType === 'contacts' && validContactIds.includes(assoc.objectId)) {
          validObjectId = true;
        } else if (assoc.objectType === 'companies' && validCompanyIds.includes(assoc.objectId)) {
          validObjectId = true;
        } else if (assoc.objectType === 'deals' && validDealIds.includes(assoc.objectId)) {
          validObjectId = true;
        } else if (assoc.objectType === 'tickets' && validTicketIds.includes(assoc.objectId)) {
          validObjectId = true;
        }
        
        if (!validObjectId) {
          console.warn(`WARNING: Skipping invalid association - Object ID ${assoc.objectId} is not a valid ${assoc.objectType} ID`);
          processedCount++;
          return { success: false, error: 'Invalid object ID' };
        }
        
        // Create the association in HubSpot (this will be rate limited)
        await this.rateLimiter.schedule(() => 
          this.client.crm.associations.v4.basicApi.create(
            'notes',
            String(assoc.noteId),
            String(assoc.objectType),
            String(assoc.objectId),
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.associationTypeId }]
          )
        , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
        
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === allAssociations.length) {
          console.log(`Created ${processedCount}/${allAssociations.length} note associations (${successCount} successful).`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Error creating note association:`, error);
        if (error.response && error.response.body) {
          console.error(`Response body: ${JSON.stringify(error.response.body)}`);
        }
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process associations in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < allAssociations.length; i += this.batchSize) {
      const batch = allAssociations.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processAssociation));
    }
    
    console.log(`Created ${successCount}/${allAssociations.length} note associations.`);
    console.log('Note associations complete.');
  }
  
  /**
   * Create associations between tasks and other objects (companies, contacts, deals, tickets)
   */
  private async createTaskAssociations(tasks: any[]) {
    console.log('Creating task associations...');
    
    const allAssociations = [];
    
    // Collect all associations
    for (const task of tasks) {
      if (task.associations) {
        // Company associations
        if (task.associations.companies) {
          for (const companyId of task.associations.companies) {
            const hubspotTaskId = this.taskIdMap.get(task.id);
            const hubspotCompanyId = this.companyIdMap.get(companyId);
            
            if (hubspotTaskId && hubspotCompanyId) {
              allAssociations.push({
                taskId: hubspotTaskId,
                objectId: hubspotCompanyId,
                objectType: 'companies',
                associationTypeId: 1 // Standard association for task-to-company
              });
            }
          }
        }
        
        // Contact associations
        if (task.associations.contacts) {
          for (const contactId of task.associations.contacts) {
            const hubspotTaskId = this.taskIdMap.get(task.id);
            const hubspotContactId = this.contactIdMap.get(contactId);
            
            if (hubspotTaskId && hubspotContactId) {
              allAssociations.push({
                taskId: hubspotTaskId,
                objectId: hubspotContactId,
                objectType: 'contacts',
                associationTypeId: 1 // Standard association for task-to-contact
              });
            }
          }
        }
        
        // Deal associations
        if (task.associations.deals) {
          for (const dealId of task.associations.deals) {
            const hubspotTaskId = this.taskIdMap.get(task.id);
            const hubspotDealId = this.dealIdMap.get(dealId);
            
            if (hubspotTaskId && hubspotDealId) {
              allAssociations.push({
                taskId: hubspotTaskId,
                objectId: hubspotDealId,
                objectType: 'deals',
                associationTypeId: 1 // Standard association for task-to-deal
              });
            }
          }
        }
        
        // Ticket associations
        if (task.associations.tickets) {
          for (const ticketId of task.associations.tickets) {
            const hubspotTaskId = this.taskIdMap.get(task.id);
            const hubspotTicketId = this.ticketIdMap.get(ticketId);
            
            if (hubspotTaskId && hubspotTicketId) {
              allAssociations.push({
                taskId: hubspotTaskId,
                objectId: hubspotTicketId,
                objectType: 'tickets',
                associationTypeId: 1 // Standard association for task-to-ticket
              });
            }
          }
        }
      }
    }
    
    console.log(`Found ${allAssociations.length} task associations to create.`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each association that respects rate limits
    const processAssociation = async (assoc) => {
      try {
        // Debug the association parameters
        console.log(`DEBUG: Creating task association - Task ID: ${assoc.taskId}, Object Type: ${assoc.objectType}, Object ID: ${assoc.objectId}`);
        
        // Validate the IDs before attempting to create the association
        const validContactIds = Array.from(this.contactIdMap.values());
        const validCompanyIds = Array.from(this.companyIdMap.values());
        const validDealIds = Array.from(this.dealIdMap.values());
        const validTicketIds = Array.from(this.ticketIdMap.values());
        
        let validObjectId = false;
        if (assoc.objectType === 'contacts' && validContactIds.includes(assoc.objectId)) {
          validObjectId = true;
        } else if (assoc.objectType === 'companies' && validCompanyIds.includes(assoc.objectId)) {
          validObjectId = true;
        } else if (assoc.objectType === 'deals' && validDealIds.includes(assoc.objectId)) {
          validObjectId = true;
        } else if (assoc.objectType === 'tickets' && validTicketIds.includes(assoc.objectId)) {
          validObjectId = true;
        }
        
        if (!validObjectId) {
          console.warn(`WARNING: Skipping invalid association - Object ID ${assoc.objectId} is not a valid ${assoc.objectType} ID`);
          processedCount++;
          return { success: false, error: 'Invalid object ID' };
        }
        
        // Create the association in HubSpot (this will be rate limited)
        await this.rateLimiter.schedule(() => 
          this.client.crm.associations.v4.basicApi.create(
            'tasks',
            assoc.taskId,
            assoc.objectType,
            assoc.objectId,
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.associationTypeId }]
          )
        );
        
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === allAssociations.length) {
          console.log(`Created ${processedCount}/${allAssociations.length} task associations (${successCount} successful).`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Error creating task association:`, error);
        if (error.response && error.response.body) {
          console.error(`Response body: ${JSON.stringify(error.response.body)}`);
        }
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process associations in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < allAssociations.length; i += this.batchSize) {
      const batch = allAssociations.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processAssociation));
    }
    
    console.log(`Created ${successCount}/${allAssociations.length} task associations.`);
    console.log('Task associations complete.');
  }
  
  /**
   * Create associations between contacts and companies
   */
  private async createContactCompanyAssociations(contacts: any[]) {
    console.log('Creating contact-company associations...');
    
    const associations = [];
    
    // Collect all associations
    for (const contact of contacts) {
      if (contact.associations && contact.associations.companies) {
        for (const companyId of contact.associations.companies) {
          const hubspotContactId = this.contactIdMap.get(contact.id);
          const hubspotCompanyId = this.companyIdMap.get(companyId);
          
          if (hubspotContactId && hubspotCompanyId) {
            associations.push({
              contactId: hubspotContactId,
              companyId: hubspotCompanyId
            });
          }
        }
      }
    }
    
    console.log(`Found ${associations.length} contact-company associations to create.`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each association that respects rate limits
    const processAssociation = async (assoc) => {
      try {
        // Create the association in HubSpot (this will be rate limited)
        await this.rateLimiter.schedule(() => 
          this.client.crm.associations.v4.basicApi.create(
            'contacts',
            String(assoc.contactId),
            'companies',
            String(assoc.companyId),
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
          )
        , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
        
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === associations.length) {
          console.log(`Created ${processedCount}/${associations.length} contact-company associations (${successCount} successful).`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Error creating contact-company association:`, error);
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process associations in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < associations.length; i += this.batchSize) {
      const batch = associations.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processAssociation));
    }
    
    console.log('Contact-company associations complete.');
  }
  
  /**
   * Create associations between deals and companies/contacts
   */
  private async createDealAssociations(deals: any[]) {
    console.log('Creating deal associations...');
    
    // Collect all associations to create
    let allAssociations = [];
    
    for (const deal of deals) {
      if (!deal.associations) continue;
      
      const hubspotDealId = this.dealIdMap.get(deal.id);
      if (!hubspotDealId) continue;
      
      // Deal-company associations
      if (deal.associations.companies && deal.associations.companies.length > 0) {
        for (const companyId of deal.associations.companies) {
          const hubspotCompanyId = this.companyIdMap.get(companyId);
          
          if (hubspotCompanyId) {
            allAssociations.push({
              type: 'company',
              dealId: hubspotDealId,
              objectId: hubspotCompanyId,
              typeId: 5
            });
          }
        }
      }
      
      // Deal-contact associations
      if (deal.associations.contacts && deal.associations.contacts.length > 0) {
        for (const contactId of deal.associations.contacts) {
          const hubspotContactId = this.contactIdMap.get(contactId);
          
          if (hubspotContactId) {
            allAssociations.push({
              type: 'contact',
              dealId: hubspotDealId,
              objectId: hubspotContactId,
              typeId: 3
            });
          }
        }
      }
    }
    
    console.log(`Found ${allAssociations.length} deal associations to create.`);
    let successCount = 0;
    let processedCount = 0;
    
    // Create a processor function for each association that respects rate limits
    const processAssociation = async (assoc) => {
      try {
        // Create the association in HubSpot (this will be rate limited)
        await this.rateLimiter.schedule(() => 
          this.client.crm.associations.v4.basicApi.create(
            'deals',
            assoc.dealId,
            assoc.type === 'company' ? 'companies' : 'contacts',
            assoc.objectId,
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.typeId }]
          )
        );
        
        successCount++;
        
        // Log progress
        processedCount++;
        if (processedCount % 10 === 0 || processedCount === allAssociations.length) {
          console.log(`Created ${processedCount}/${allAssociations.length} deal associations (${successCount} successful).`);
        }
        
        return { success: true };
      } catch (error) {
        console.error(`Error creating deal-${assoc.type} association:`, error);
        processedCount++;
        return { success: false, error };
      }
    };
    
    // Process associations in batches to avoid overloading memory while maintaining rate limits
    for (let i = 0; i < allAssociations.length; i += this.batchSize) {
      const batch = allAssociations.slice(i, i + this.batchSize);
      await Promise.all(batch.map(processAssociation));
    }
    
    console.log(`Created ${successCount}/${allAssociations.length} deal associations.`);
    console.log('Deal associations complete.');
  }
  
  /**
   * Save ID mappings for future reference
   */
  private async saveIdMappings() {
    const orgDir = path.join(this.baseDir, this.organizationId);
    
    // Convert maps to objects for storage
    const mappings = {
      companies: Object.fromEntries(this.companyIdMap),
      contacts: Object.fromEntries(this.contactIdMap),
      deals: Object.fromEntries(this.dealIdMap),
      tickets: Object.fromEntries(this.ticketIdMap),
      notes: Object.fromEntries(this.noteIdMap),
      tasks: Object.fromEntries(this.taskIdMap),
      uploadedAt: new Date().toISOString()
    };
    
    await fs.writeJson(path.join(orgDir, 'hubspot-id-mappings.json'), mappings, { spaces: 2 });
    console.log('Saved ID mappings to hubspot-id-mappings.json');
  }
  
  /**
   * Load data from JSON files
   */
  private async loadData() {
    const orgDir = path.join(this.baseDir, this.organizationId);
    
    // Load data from JSON files
    const companies = await fs.readJson(path.join(orgDir, 'base/companies.json')).catch(() => []);
    const contacts = await fs.readJson(path.join(orgDir, 'base/contacts.json')).catch(() => []);
    const deals = await fs.readJson(path.join(orgDir, 'base/deals.json')).catch(() => []);
    const tickets = await fs.readJson(path.join(orgDir, 'base/tickets.json')).catch(() => []);
    const notes = await fs.readJson(path.join(orgDir, 'base/notes.json')).catch(() => []);
    const tasks = await fs.readJson(path.join(orgDir, 'base/tasks.json')).catch(() => []);
    
    return { companies, contacts, deals, tickets, notes, tasks };
  }

  /**
   * Main method to upload all data to HubSpot
   * 
   * This version only creates entities without associations.
   * Use export-associations.ts and create-associations.ts to create associations separately.
   */
  public async uploadAll() {
    try {
      console.log(`Starting upload for organization: ${this.organizationId}`);
      
      // Clean up existing data if enabled
      if (this.cleanupBeforeUpload) {
        console.log('Cleaning up existing data before upload...');
        await this.cleanup();
        console.log('Cleanup completed, continuing with upload...');
      }
      
      // Load data
      const { companies, contacts, deals, tickets, notes, tasks } = await this.loadData();
      
      // Upload base entities
      console.log('\n=== UPLOADING BASE ENTITIES ONLY ===');
      console.log('NOTE: Associations will NOT be created in this step.');
      console.log('      Use export-associations.ts and create-associations.ts to create associations.');
      
      // Upload companies
      console.log('\nUploading companies...');
      await this.uploadCompanies(companies);
      
      // Upload contacts
      console.log('\nUploading contacts...');
      await this.uploadContacts(contacts);
      
      // Upload deals
      console.log('\nUploading deals...');
      await this.uploadDeals(deals);
      
      // Upload tickets (if available)
      console.log('\nUploading tickets...');
      await this.uploadTickets(tickets);
      
      // Upload notes (without associations)
      console.log('\nUploading notes (without associations)...');
      let noteSuccessCount = 0;
      let noteProcessedCount = 0;
      
      for (let i = 0; i < notes.length; i += this.batchSize) {
        const batch = notes.slice(i, i + this.batchSize);
        
        await Promise.all(batch.map(async (note) => {
          try {
            // Simplified note data without associations
            const hubspotNote = {
              properties: {
                hs_note_body: note.properties.hs_note_body,
                hs_timestamp: note.properties.hs_timestamp,
                // Include any additional required properties but no associations
              }
            };
            
            // Create the note
            const response = await this.rateLimiter.schedule(() => 
              this.client.crm.objects.notes.basicApi.create(hubspotNote)
            );
            
            // Store ID mapping
            this.noteIdMap.set(note.id, response.id);
            noteSuccessCount++;
            
          } catch (error) {
            console.error(`Error creating note ${note.id}:`, error.message);
          }
          
          noteProcessedCount++;
        }));
        
        console.log(`Uploaded ${noteProcessedCount}/${notes.length} notes (${noteSuccessCount} successful).`);
        
        // Small delay between batches
        if (i + this.batchSize < notes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Upload tasks (without associations)
      console.log('\nUploading tasks (without associations)...');
      let taskSuccessCount = 0;
      let taskProcessedCount = 0;
      
      for (let i = 0; i < tasks.length; i += this.batchSize) {
        const batch = tasks.slice(i, i + this.batchSize);
        
        await Promise.all(batch.map(async (task) => {
          try {
            // Simplified task data without associations
            const hubspotTask = {
              properties: {
                hs_task_subject: task.properties.hs_task_subject,
                hs_task_body: task.properties.hs_task_body,
                hs_task_status: task.properties.hs_task_status,
                hs_task_priority: task.properties.hs_task_priority,
                hs_task_type: task.properties.hs_task_type,
                hs_timestamp: task.properties.hs_timestamp
                // Include any additional required properties but no associations
              }
            };
            
            // Create the task
            const response = await this.rateLimiter.schedule(() => 
              this.client.crm.objects.tasks.basicApi.create(hubspotTask)
            );
            
            // Store ID mapping
            this.taskIdMap.set(task.id, response.id);
            taskSuccessCount++;
            
          } catch (error) {
            console.error(`Error creating task ${task.id}:`, error.message);
          }
          
          taskProcessedCount++;
        }));
        
        console.log(`Uploaded ${taskProcessedCount}/${tasks.length} tasks (${taskSuccessCount} successful).`);
        
        // Small delay between batches
        if (i + this.batchSize < tasks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Save ID mappings
      await this.saveIdMappings();
      
      // Provide a summary of the upload
      console.log('\nUpload Summary:');
      console.log(`- Companies: ${this.companyIdMap.size}/${companies.length}`);
      console.log(`- Contacts: ${this.contactIdMap.size}/${contacts.length}`);
      console.log(`- Deals: ${this.dealIdMap.size}/${deals.length}`);
      console.log(`- Tickets: ${this.ticketIdMap.size}/${tickets.length}`);
      console.log(`- Notes: ${this.noteIdMap.size}/${notes.length}`);
      console.log(`- Tasks: ${this.taskIdMap.size}/${tasks.length}`);
      
      console.log('\nAll entities have been uploaded WITHOUT associations.');
      console.log('To create associations:');
      console.log('1. Run: bun run seeders/hubspot/export-associations.ts <organization-id>');
      console.log('2. Run: bun run seeders/hubspot/create-associations.ts <organization-id>');
      
      return true;
    } catch (error) {
      console.error('Upload failed:', error);
      return false;
    }
  }
  
  /**
   * Create associations for a single note
   */
  private async createSingleNoteAssociations(note: any, hubspotNoteId: string) {
    try {
      // Get associated entities
      const localCompanyIds = note.associations.companies || [];
      const localContactIds = note.associations.contacts || [];
      const localDealIds = note.associations.deals || [];
      const localTicketIds = note.associations.tickets || [];
      
      // Get HubSpot IDs
      const hubspotCompanyIds = localCompanyIds
        .map(id => this.companyIdMap.get(id))
        .filter(id => id !== undefined);
        
      const hubspotContactIds = localContactIds
        .map(id => this.contactIdMap.get(id))
        .filter(id => id !== undefined);
        
      const hubspotDealIds = localDealIds
        .map(id => this.dealIdMap.get(id))
        .filter(id => id !== undefined);
        
      const hubspotTicketIds = localTicketIds
        .map(id => this.ticketIdMap.get(id))
        .filter(id => id !== undefined);
      
      let associationCount = 0;
      
      // Company associations
      for (const companyId of hubspotCompanyIds) {
        try {
          console.log(`Creating note-company association: note/${hubspotNoteId} -> company/${companyId}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Let's try the reversed direction for note-company associations
          console.log(`Using reversed direction for note-company association (company→note)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'companies',
              String(companyId),
              'notes',
              String(hubspotNoteId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating note-company association: ${error.message}`);
        }
      }
      
      // Contact associations
      for (const contactId of hubspotContactIds) {
        try {
          console.log(`Creating note-contact association: note/${hubspotNoteId} -> contact/${contactId}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Let's try the reversed direction for note-contact associations
          console.log(`Using reversed direction for note-contact association (contact→note)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'contacts',
              String(contactId),
              'notes',
              String(hubspotNoteId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating note-contact association: ${error.message}`);
        }
      }
      
      // Deal associations
      for (const dealId of hubspotDealIds) {
        try {
          console.log(`Creating note-deal association: note/${hubspotNoteId} -> deal/${dealId}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Let's try the reversed direction for note-deal associations
          console.log(`Using reversed direction for note-deal association (deal→note)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'deals',
              String(dealId),
              'notes',
              String(hubspotNoteId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating note-deal association: ${error.message}`);
        }
      }
      
      // Ticket associations
      for (const ticketId of hubspotTicketIds) {
        try {
          // Let's try the reversed direction for note-ticket associations
          console.log(`Using reversed direction for note-ticket association (ticket→note)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'tickets',
              String(ticketId),
              'notes',
              String(hubspotNoteId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating note-ticket association: ${error.message}`);
        }
      }
      
      console.log(`Created ${associationCount} associations for note ${hubspotNoteId}`);
    } catch (error) {
      console.error(`Error creating note associations: ${error.message}`);
    }
  }
  
  /**
   * Create associations for a single task
   */
  private async createSingleTaskAssociations(task: any, hubspotTaskId: string) {
    try {
      // Get associated entities
      const localCompanyIds = task.associations.companies || [];
      const localContactIds = task.associations.contacts || [];
      const localDealIds = task.associations.deals || [];
      const localTicketIds = task.associations.tickets || [];
      
      // Get HubSpot IDs
      const hubspotCompanyIds = localCompanyIds
        .map(id => this.companyIdMap.get(id))
        .filter(id => id !== undefined);
        
      const hubspotContactIds = localContactIds
        .map(id => this.contactIdMap.get(id))
        .filter(id => id !== undefined);
        
      const hubspotDealIds = localDealIds
        .map(id => this.dealIdMap.get(id))
        .filter(id => id !== undefined);
        
      const hubspotTicketIds = localTicketIds
        .map(id => this.ticketIdMap.get(id))
        .filter(id => id !== undefined);
      
      let associationCount = 0;
      
      // Company associations
      for (const companyId of hubspotCompanyIds) {
        try {
          // Use reversed direction for task-company associations
          console.log(`Using reversed direction for task-company association (company→task)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'companies',
              String(companyId),
              'tasks',
              String(hubspotTaskId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating task-company association: ${error.message}`);
        }
      }
      
      // Contact associations
      for (const contactId of hubspotContactIds) {
        try {
          // Use reversed direction for task-contact associations
          console.log(`Using reversed direction for task-contact association (contact→task)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'contacts',
              String(contactId),
              'tasks',
              String(hubspotTaskId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating task-contact association: ${error.message}`);
        }
      }
      
      // Deal associations
      for (const dealId of hubspotDealIds) {
        try {
          // Use reversed direction for task-deal associations
          console.log(`Using reversed direction for task-deal association (deal→task)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'deals',
              String(dealId),
              'tasks',
              String(hubspotTaskId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating task-deal association: ${error.message}`);
        }
      }
      
      // Ticket associations
      for (const ticketId of hubspotTicketIds) {
        try {
          // Use reversed direction for task-ticket associations
          console.log(`Using reversed direction for task-ticket association (ticket→task)`);
          await this.rateLimiter.schedule(() => 
            this.client.crm.associations.v4.basicApi.create(
              'tickets',
              String(ticketId),
              'tasks',
              String(hubspotTaskId),
              [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }]
            )
          , { requestTimeoutMs: 10000 }) // Add a longer timeout to avoid network issues
          associationCount++;
        } catch (error) {
          console.error(`Error creating task-ticket association: ${error.message}`);
        }
      }
      
      console.log(`Created ${associationCount} associations for task ${hubspotTaskId}`);
    } catch (error) {
      console.error(`Error creating task associations: ${error.message}`);
    }
  }
}

// Example usage when run directly
if (require.main === module) {
  const organizationId = process.argv[2];
  const skipCleanup = process.argv.includes('--skip-cleanup');
  
  if (!organizationId) {
    console.error('Error: Organization ID is required.');
    console.error('Usage: bun run seeders/hubspot/hubspot-uploader.ts <organization-id> [--skip-cleanup]');
    process.exit(1);
  }
  
  const uploader = new HubSpotUploader({ 
    organizationId,
    cleanupBeforeUpload: !skipCleanup
  });
  
  uploader.uploadAll()
    .then(success => {
      if (!success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}