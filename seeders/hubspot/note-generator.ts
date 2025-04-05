/**
 * Note Generator
 * 
 * Generates realistic note engagement data for HubSpot with associations to companies, contacts, deals, and tickets.
 * Uses Faker.js for realistic data generation.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { Company } from './company-generator';
import { Contact } from './contact-generator';
import { Deal } from './deal-generator';
import { Ticket } from './ticket-generator';
import { faker } from '@faker-js/faker';

export interface NoteDistribution {
  byCompanySize: {
    [size: string]: { min: number; max: number };
  };
  byDealStage: {
    [stage: string]: { min: number; max: number };
  };
  byTicketStatus: {
    [status: string]: { min: number; max: number };
  };
}

export interface NoteGeneratorOptions extends GeneratorOptions {
  companies: Company[];
  contacts: Contact[];
  deals?: Deal[];
  tickets?: Ticket[];
  distribution?: NoteDistribution;
  noteTypes?: string[];
}

export interface Note {
  id: string;
  hubspotId?: string;
  properties: {
    hs_note_body: string;
    hs_timestamp?: string;
    neuco_effective_date: string;
    // Removed neuco_note_type as it doesn't exist in HubSpot
    [key: string]: any;
  };
  associations: {
    companies?: string[];
    contacts?: string[];
    deals?: string[];
    tickets?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export class NoteGenerator extends BaseGenerator {
  private companies: Company[];
  private contacts: Contact[];
  private deals: Deal[];
  private tickets: Ticket[];
  private distribution: NoteDistribution;
  private noteTypes: string[];
  
  // Note templates by context
  private noteTemplates: { [context: string]: string[] } = {
    'deal': [
      'Had a productive call with {contact}. They expressed interest in our {product} solution.',
      'Sent proposal to {contact}. Waiting for feedback on pricing structure.',
      'Followed up with {contact} about next steps. They plan to review internally this week.',
      'Met with decision makers at {company}. They have concerns about implementation timeline.',
      '{contact} requested additional information about our {product} features and integration options.',
      'Discussed ROI calculations with {contact}. They need to secure budget approval.',
      'Contract negotiations with {company} legal team. Expect resolution by end of week.',
      '{contact} confirmed they\'re ready to move forward. Will schedule final review meeting.'
    ],
    'ticket': [
      'Investigated issue reported by {contact}. Problem appears to be related to configuration settings.',
      'Provided troubleshooting steps to {contact} for the reported error.',
      'Escalated ticket to engineering team for further investigation.',
      'Followed up with {contact} to confirm if the issue is resolved.',
      'Received additional information from {contact} about the issue circumstances.',
      'Implemented workaround solution for {company} until permanent fix is available.',
      'Checked system logs and identified potential cause of the reported problem.',
      'Closing ticket as resolved. {contact} confirmed the solution works.'
    ],
    'contact': [
      'Introductory call with {contact} from {company}. Discussed their current needs and pain points.',
      'Learned that {contact} is the primary decision maker for {product} purchases.',
      '{contact} mentioned they\'re currently using {competitor} but experiencing issues with support.',
      'Sent welcome email to {contact} with relevant resources and next steps.',
      '{contact} shared insights about {company}\'s growth plans for next quarter.',
      'Added {contact} to our newsletter list based on their interest in {product}.',
      'Recorded {contact}\'s preference for communication (prefers email over calls).',
      '{contact} introduced me to their colleague who handles technical evaluations.'
    ],
    'company': [
      'Researched {company} - they\'ve been in business for {years} years and focus on {industry}.',
      '{company} recently expanded to new markets and are looking for solutions to support growth.',
      'Found news article about {company}\'s recent acquisition of {acquisition_target}.',
      '{company} has approximately {employee_count} employees and {revenue} annual revenue.',
      'Identified key decision makers at {company}: {contact1}, {contact2}, and {contact3}.',
      '{company} is undergoing digital transformation initiative led by {contact}.',
      'Learned {company} is planning to {future_plan} in the next {timeframe}.',
      'Competitive analysis: {company} currently uses {competitor1} and {competitor2}.'
    ]
  };
  
  // Note contexts for distribution
  private noteContexts: string[] = ['deal', 'ticket', 'contact', 'company'];
  
  constructor(options: NoteGeneratorOptions) {
    super(options);
    this.companies = options.companies;
    this.contacts = options.contacts;
    this.deals = options.deals || [];
    this.tickets = options.tickets || [];
    
    // Default note types if not provided
    this.noteTypes = options.noteTypes || [
      'CALL_NOTES',
      'MEETING_NOTES',
      'EMAIL_NOTES',
      'RESEARCH',
      'FOLLOW_UP'
    ];
    
    // Default distribution if not provided
    this.distribution = options.distribution || {
      byCompanySize: {
        // For minimal test data, just 1 note per company
        'Small': { min: 1, max: 1 },
        'Medium': { min: 1, max: 1 },
        'Large': { min: 1, max: 1 },
        'Enterprise': { min: 1, max: 1 }
      },
      byDealStage: {
        // One note for each deal stage
        'appointmentscheduled': { min: 1, max: 1 },
        'qualifiedtobuy': { min: 1, max: 1 },
        'presentationscheduled': { min: 1, max: 1 },
        'decisionmakerboughtin': { min: 1, max: 1 },
        'closedwon': { min: 1, max: 1 },
        'closedlost': { min: 1, max: 1 }
      },
      byTicketStatus: {
        // One note for each ticket status
        'NEW': { min: 1, max: 1 },
        'WAITING_ON_CONTACT': { min: 1, max: 1 },
        'WAITING_ON_US': { min: 1, max: 1 },
        'CLOSED': { min: 1, max: 1 }
      }
    };
    
    // Seed faker with our deterministic seed for reproducible results
    faker.seed(this.getSeedNumber(this.seed));
  }
  
  /**
   * Convert a string seed to a number for Faker
   */
  private getSeedNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Generate notes for all entities
   */
  public generateNotes(): Note[] {
    const notes: Note[] = [];
    let noteIndex = 0;
    
    // Generate company and contact notes
    this.companies.forEach(company => {
      // Set faker seed for this company
      faker.seed(this.getSeedNumber(`${company.id}-notes`));
      
      // Determine company size
      const employees = company.properties.numberofemployees || 0;
      let sizeCategory = 'Small';
      
      if (employees > 1000) {
        sizeCategory = 'Enterprise';
      } else if (employees > 200) {
        sizeCategory = 'Large';
      } else if (employees > 50) {
        sizeCategory = 'Medium';
      }
      
      // Get company contacts
      const companyContacts = this.contacts.filter(contact => 
        contact.associations.companies.includes(company.id)
      );
      
      if (companyContacts.length === 0) {
        return; // Skip if no contacts
      }
      
      // Determine number of notes based on company size
      const sizeDistribution = this.distribution.byCompanySize[sizeCategory];
      const companyNoteCount = this.getRandomInt(sizeDistribution.min, sizeDistribution.max);
      
      // Generate company notes
      for (let i = 0; i < companyNoteCount; i++) {
        // Create a company note
        const note = this.createNote(
          `${company.id}-note-${noteIndex++}`,
          'company',
          company,
          this.pickRandom(companyContacts),
          null,
          null
        );
        notes.push(note);
      }
      
      // Generate contact notes
      companyContacts.forEach(contact => {
        // Only create notes for some contacts (randomly)
        if (this.randomBoolean(0.7)) { // 70% chance
          const contactNoteCount = this.getRandomInt(1, 3);
          
          for (let i = 0; i < contactNoteCount; i++) {
            // Create a contact note
            const note = this.createNote(
              `${contact.id}-note-${noteIndex++}`,
              'contact',
              company,
              contact,
              null,
              null
            );
            notes.push(note);
          }
        }
      });
    });
    
    // Generate deal notes
    if (this.deals.length > 0) {
      this.deals.forEach(deal => {
        // Set faker seed for this deal
        faker.seed(this.getSeedNumber(`${deal.id}-notes`));
        
        // Determine number of notes based on deal stage
        const stage = deal.properties.dealstage;
        const stageDistribution = this.distribution.byDealStage[stage] || { min: 1, max: 3 };
        const dealNoteCount = this.getRandomInt(stageDistribution.min, stageDistribution.max);
        
        // Get associated company and contacts
        const companyId = deal.associations.companies[0];
        const company = this.companies.find(c => c.id === companyId);
        
        if (!company) return; // Skip if company not found
        
        const contactIds = deal.associations.contacts;
        const contacts = this.contacts.filter(c => contactIds.includes(c.id));
        
        if (contacts.length === 0) return; // Skip if no contacts
        
        // Generate deal notes
        for (let i = 0; i < dealNoteCount; i++) {
          // Create a deal note
          const note = this.createNote(
            `${deal.id}-note-${noteIndex++}`,
            'deal',
            company,
            this.pickRandom(contacts),
            deal,
            null
          );
          notes.push(note);
        }
      });
    }
    
    // Generate ticket notes
    if (this.tickets.length > 0) {
      this.tickets.forEach(ticket => {
        // Set faker seed for this ticket
        faker.seed(this.getSeedNumber(`${ticket.id}-notes`));
        
        // Get ticket status
        const status = ticket.properties.hs_pipeline_stage;
        // Map pipeline stage back to status
        let statusName;
        switch (status) {
          case '1': statusName = 'NEW'; break;
          case '2': statusName = 'WAITING_ON_CONTACT'; break;
          case '3': statusName = 'WAITING_ON_US'; break;
          case '4': statusName = 'CLOSED'; break;
          default: statusName = 'NEW';
        }
        
        // Determine number of notes based on ticket status
        const statusDistribution = this.distribution.byTicketStatus[statusName] || { min: 1, max: 2 };
        const ticketNoteCount = this.getRandomInt(statusDistribution.min, statusDistribution.max);
        
        // Get associated company and contact
        const companyId = ticket.associations.companies[0];
        const company = this.companies.find(c => c.id === companyId);
        
        if (!company) return; // Skip if company not found
        
        const contactId = ticket.associations.contacts[0];
        const contact = this.contacts.find(c => c.id === contactId);
        
        if (!contact) return; // Skip if contact not found
        
        // Generate ticket notes
        for (let i = 0; i < ticketNoteCount; i++) {
          // Create a ticket note
          const note = this.createNote(
            `${ticket.id}-note-${noteIndex++}`,
            'ticket',
            company,
            contact,
            null,
            ticket
          );
          notes.push(note);
        }
      });
    }
    
    // Sort notes by effective date
    notes.sort((a, b) => 
      new Date(a.properties.neuco_effective_date).getTime() - 
      new Date(b.properties.neuco_effective_date).getTime()
    );
    
    // Save to JSON
    this.saveToJson(notes, 'base/notes.json');
    
    return notes;
  }
  
  /**
   * Create a note with appropriate associations
   */
  private createNote(
    idBase: string,
    context: string,
    company: Company,
    contact: Contact,
    deal: Deal | null = null,
    ticket: Ticket | null = null
  ): Note {
    // Create deterministic ID
    const id = this.generateDeterministicId(idBase);
    
    // Get entity creation dates to ensure note is created after entities
    const companyDate = new Date(company.properties.neuco_effective_date);
    const contactDate = new Date(contact.properties.neuco_effective_date);
    const dealDate = deal ? new Date(deal.properties.neuco_effective_date) : null;
    const ticketDate = ticket ? new Date(ticket.properties.neuco_effective_date) : null;
    
    // Find the latest entity date
    let latestEntityDate = new Date(Math.max(
      companyDate.getTime(),
      contactDate.getTime(),
      dealDate ? dealDate.getTime() : 0,
      ticketDate ? ticketDate.getTime() : 0
    ));
    
    // Add random days (1-15) to the latest entity date
    const noteDate = new Date(latestEntityDate);
    noteDate.setDate(noteDate.getDate() + this.getRandomInt(1, 15));
    
    // Ensure note date is not in the future
    const now = new Date();
    if (noteDate > now) {
      noteDate.setTime(now.getTime() - this.getRandomInt(1, 15) * 24 * 60 * 60 * 1000);
    }
    
    // Format dates according to HubSpot requirements (milliseconds since epoch)
    const effectiveDateTimestamp = noteDate.getTime();
    
    // Select a note type
    const noteType = this.pickRandom(this.noteTypes);
    
    // Generate note content
    const noteBody = this.generateNoteContent(context, {
      company: company.properties.name,
      contact: `${contact.properties.firstname} ${contact.properties.lastname}`,
      product: faker.commerce.productName(),
      employee_count: company.properties.numberofemployees,
      revenue: `$${(company.properties.annualrevenue / 1000000).toFixed(1)}M`,
      years: this.getRandomInt(1, 30),
      industry: company.properties.industry,
      acquisition_target: faker.company.name(),
      contact1: faker.person.fullName(),
      contact2: faker.person.fullName(),
      contact3: faker.person.fullName(),
      future_plan: faker.company.buzzPhrase(),
      timeframe: `${this.getRandomInt(3, 18)} months`,
      competitor: faker.company.name(),
      competitor1: faker.company.name(),
      competitor2: faker.company.name()
    });
    
    // Create associations
    const associations: any = {};
    
    // Always associate with the company and contact
    associations.companies = [company.id];
    associations.contacts = [contact.id];
    
    // Add deal association if applicable
    if (deal) {
      associations.deals = [deal.id];
    }
    
    // Add ticket association if applicable
    if (ticket) {
      associations.tickets = [ticket.id];
    }
    
    // Create the note
    const note: Note = {
      id,
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: effectiveDateTimestamp.toString(), // HubSpot format: milliseconds since epoch
        // Removed neuco_note_type as it doesn't exist in HubSpot
        neuco_effective_date: noteDate.toISOString() // Our custom ISO format date for time travel
      },
      associations,
      createdAt: noteDate.toISOString(),
      updatedAt: noteDate.toISOString()
    };
    
    return note;
  }
  
  /**
   * Generate note content from template
   */
  private generateNoteContent(context: string, variables: Record<string, any>): string {
    // Get templates for the given context
    const templates = this.noteTemplates[context] || this.noteTemplates['company'];
    
    // Select a random template
    let template = this.pickRandom(templates);
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(`{${key}}`, value);
    }
    
    // Add a random follow-up sentence 50% of the time
    if (this.randomBoolean(0.5)) {
      const followUps = [
        `Will follow up by ${faker.date.future({ days: 14 }).toLocaleDateString()}.`,
        `Next steps: ${faker.company.buzzPhrase()}.`,
        `Plan to reconnect in ${this.getRandomInt(1, 4)} weeks.`,
        `Scheduled next meeting for ${faker.date.future({ days: 14 }).toLocaleDateString()}.`,
        `Action item: ${faker.company.buzzVerb()} the ${faker.company.buzzNoun()}.`
      ];
      
      template += ' ' + this.pickRandom(followUps);
    }
    
    return template;
  }
}