/**
 * Ticket Generator
 * 
 * Generates realistic ticket data for HubSpot seeding with company and contact associations.
 * Uses Faker.js for realistic data generation.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { Company } from './company-generator';
import { Contact } from './contact-generator';
import { HubSpotSchemaLoader } from './hubspot-schema-loader';
import { faker } from '@faker-js/faker';

export interface TicketDistribution {
  byCompanySize: {
    [size: string]: { min: number; max: number };
  };
  byStatus: {
    [status: string]: number;
  };
}

export interface TicketPriority {
  name: string;
  probability: number;
}

export interface TicketGeneratorOptions extends GeneratorOptions {
  companies: Company[];
  contacts: Contact[];
  distribution?: TicketDistribution;
  priorities?: TicketPriority[];
  pipelineName?: string;
}

export interface Ticket {
  id: string;
  hubspotId?: string;
  properties: {
    subject: string;
    content: string;
    hs_pipeline: string;
    hs_pipeline_stage: string;
    hs_ticket_priority: string;
    createdate?: string;
    neuco_effective_date: string;
    [key: string]: any;
  };
  associations: {
    companies: string[];
    contacts: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export class TicketGenerator extends BaseGenerator {
  private companies: Company[];
  private contacts: Contact[];
  private distribution: TicketDistribution;
  private priorities: TicketPriority[];
  private pipelineName: string;
  private hubspotSchema: HubSpotSchemaLoader;
  
  // HubSpot-specific ticket statuses
  private hubspotStatuses: string[] = [
    'NEW',
    'WAITING_ON_CONTACT',
    'WAITING_ON_US',
    'CLOSED'
  ];

  // Ticket subject prefixes by category
  private ticketCategories: { [category: string]: string[] } = {
    'technical': [
      'Error when', 'Cannot access', 'Problem with', 'Bug in', 'Feature not working',
      'System crash', 'Login issue', 'Integration failure', 'Performance degradation'
    ],
    'billing': [
      'Billing question', 'Invoice issue', 'Payment problem', 'Subscription inquiry',
      'Refund request', 'Pricing question', 'Upgrade account', 'Downgrade account'
    ],
    'account': [
      'Account access', 'User permissions', 'Reset password', 'Account setup',
      'Profile update', 'Account deletion', 'User management', 'API credentials'
    ],
    'product': [
      'How to use', 'Feature request', 'Product guidance', 'Documentation unclear',
      'Training needed', 'Best practices', 'Product configuration', 'Custom setup'
    ],
    'general': [
      'General inquiry', 'Information request', 'Feedback', 'Suggestion',
      'Testimonial', 'Partnership inquiry', 'Press contact', 'Other question'
    ]
  };

  constructor(options: TicketGeneratorOptions) {
    super(options);
    this.companies = options.companies;
    this.contacts = options.contacts;
    this.pipelineName = options.pipelineName || 'default';
    this.hubspotSchema = new HubSpotSchemaLoader();
    
    // Default distribution if not provided
    this.distribution = options.distribution || {
      byCompanySize: {
        // For minimal test data, just 1 ticket per company
        'Small': { min: 1, max: 1 },
        'Medium': { min: 1, max: 1 },
        'Large': { min: 1, max: 1 },
        'Enterprise': { min: 1, max: 1 }
      },
      byStatus: {
        // Create one ticket for each status to test all statuses
        'NEW': 25,
        'WAITING_ON_CONTACT': 25,
        'WAITING_ON_US': 25,
        'CLOSED': 25
      }
    };
    
    // Default priorities if not provided
    this.priorities = options.priorities || [
      { name: 'HIGH', probability: 20 },
      { name: 'MEDIUM', probability: 50 },
      { name: 'LOW', probability: 30 }
    ];
    
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
   * Generate tickets for companies
   */
  public generateTickets(): Ticket[] {
    const tickets: Ticket[] = [];
    const now = new Date();
    let ticketIndex = 0;
    
    // Get ticket pipelines and ensure we have a valid pipeline ID
    // In HubSpot, the default ticket pipeline is usually "0"
    const pipelineId = "0"; // Default HubSpot ticket pipeline
    
    // Generate tickets for each company
    this.companies.forEach(company => {
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
      
      // Set faker seed for this company
      faker.seed(this.getSeedNumber(`${company.id}-tickets`));
      
      // Determine number of tickets based on company size
      const sizeDistribution = this.distribution.byCompanySize[sizeCategory];
      const ticketCount = this.getRandomInt(sizeDistribution.min, sizeDistribution.max);
      
      // Generate tickets
      for (let i = 0; i < ticketCount; i++) {
        // Seed faker for this specific ticket to ensure deterministic but varied results
        faker.seed(this.getSeedNumber(`${company.id}-ticket-${i}`));
        
        // Select a primary contact for this ticket
        const ticketContact = this.pickRandom(companyContacts);
        
        // Select a status based on distribution
        const status = this.selectStatusByDistribution();
        
        // Select a priority
        const priority = this.selectPriorityByDistribution();
        
        // Create deterministic ID
        const id = this.generateDeterministicId(`${company.id}-ticket-${ticketIndex++}`);
        
        // Create ticket with effective date after company creation
        const companyEffectiveDate = new Date(company.properties.neuco_effective_date);
        const ticketEffectiveDate = new Date(companyEffectiveDate);
        // Add random days (15-180) to company effective date
        ticketEffectiveDate.setDate(ticketEffectiveDate.getDate() + this.getRandomInt(15, 180));
        
        // Format dates according to HubSpot requirements (milliseconds since epoch)
        const effectiveDateTimestamp = ticketEffectiveDate.getTime();
        
        // Select ticket category and subject
        const category = this.pickRandom(Object.keys(this.ticketCategories));
        const subjectPrefixes = this.ticketCategories[category];
        const subjectPrefix = this.pickRandom(subjectPrefixes);
        const subject = `${subjectPrefix} ${this.generateTicketSubject(category)}`;
        
        // Generate content
        const content = this.generateTicketContent(category, company.properties.name);
        
        // Map status to pipeline stage
        let pipelineStage;
        switch(status) {
          case 'NEW': pipelineStage = '1'; break; // Default HubSpot ticket pipeline stages
          case 'WAITING_ON_CONTACT': pipelineStage = '2'; break;
          case 'WAITING_ON_US': pipelineStage = '3'; break;
          case 'CLOSED': pipelineStage = '4'; break;
          default: pipelineStage = '1';
        }
        
        // Create the ticket with HubSpot-specific properties
        const ticket: Ticket = {
          id,
          properties: {
            subject,
            content,
            hs_pipeline: pipelineId,
            hs_pipeline_stage: pipelineStage,
            hs_ticket_priority: priority,
            createdate: effectiveDateTimestamp.toString(), // HubSpot format: milliseconds since epoch
            
            // Neuco-specific fields for our internal tracking
            // Removed neuco_ticket_category as it doesn't exist in HubSpot
            neuco_effective_date: ticketEffectiveDate.toISOString() // Our custom ISO format date for time travel
          },
          associations: {
            companies: [company.id],
            contacts: [ticketContact.id]
          },
          createdAt: ticketEffectiveDate.toISOString(),
          updatedAt: ticketEffectiveDate.toISOString()
        };
        
        tickets.push(ticket);
      }
    });
    
    // Sort tickets by effective date
    tickets.sort((a, b) => 
      new Date(a.properties.neuco_effective_date).getTime() - 
      new Date(b.properties.neuco_effective_date).getTime()
    );
    
    // Save to JSON
    this.saveToJson(tickets, 'base/tickets.json');
    
    // Also save associations to separate files for tracking
    this.saveAssociations(tickets);
    
    return tickets;
  }
  
  /**
   * Select a status based on distribution
   */
  private selectStatusByDistribution(): string {
    const rand = this.random() * 100;
    let cumulativeProbability = 0;
    
    // Use HubSpot status values directly
    for (const status of this.hubspotStatuses) {
      cumulativeProbability += this.distribution.byStatus[status] || 0;
      if (rand <= cumulativeProbability) {
        return status;
      }
    }
    
    return this.hubspotStatuses[0]; // Default to first status
  }
  
  /**
   * Select a priority based on distribution
   */
  private selectPriorityByDistribution(): string {
    const rand = this.random() * 100;
    let cumulativeProbability = 0;
    
    for (const priority of this.priorities) {
      cumulativeProbability += priority.probability;
      if (rand <= cumulativeProbability) {
        return priority.name;
      }
    }
    
    return this.priorities[0].name; // Default to first priority
  }
  
  /**
   * Generate a realistic ticket subject
   */
  private generateTicketSubject(category: string): string {
    switch(category) {
      case 'technical':
        return `${faker.commerce.productName()} ${faker.commerce.productMaterial()}`;
      case 'billing':
        return `${faker.finance.accountName()} ${faker.finance.transactionType()}`;
      case 'account':
        return `${faker.hacker.noun()} ${faker.hacker.verb()}`;
      case 'product':
        return `${faker.commerce.product()} ${faker.commerce.productAdjective()}`;
      case 'general':
      default:
        return `${faker.company.buzzNoun()} ${faker.company.buzzVerb()}`;
    }
  }
  
  /**
   * Generate ticket content
   */
  private generateTicketContent(category: string, companyName: string): string {
    let content = `From: ${faker.person.fullName()} at ${companyName}\n\n`;
    
    switch(category) {
      case 'technical':
        content += `I'm experiencing an issue with ${faker.commerce.productName()}. `;
        content += `When I try to ${faker.hacker.verb()} the ${faker.hacker.noun()}, I get the following error:\n\n`;
        content += `"${faker.hacker.phrase()}"\n\n`;
        content += `This started happening on ${faker.date.recent().toLocaleDateString()}. `;
        content += `I've tried ${faker.hacker.verb()}ing the ${faker.hacker.noun()}, but that didn't resolve the issue. `;
        content += `Please advise on how to fix this problem.`;
        break;
      
      case 'billing':
        content += `I have a question regarding my ${faker.finance.accountName()} ${faker.finance.transactionType()}. `;
        content += `On invoice #${faker.string.numeric(6)}, dated ${faker.date.recent().toLocaleDateString()}, `;
        content += `there's a charge for ${faker.finance.amount()} that I don't recognize. `;
        content += `Can you please explain this charge? `;
        content += `Our purchase order number is PO-${faker.string.alphanumeric(8).toUpperCase()}.`;
        break;
      
      case 'account':
        content += `We need assistance with our account settings. `;
        content += `We're trying to ${faker.hacker.verb()} our ${faker.hacker.noun()} configuration, `;
        content += `but we don't see where to make this change. `;
        content += `We need this updated before ${faker.date.future().toLocaleDateString()} `;
        content += `for our upcoming ${faker.company.buzzNoun()} project.`;
        break;
      
      case 'product':
        content += `I'm looking for information about the ${faker.commerce.productName()} feature. `;
        content += `Specifically, I want to know if it can ${faker.hacker.verb()} with our existing ${faker.hacker.noun()} system. `;
        content += `Does your product support ${faker.company.buzzPhrase()}? `;
        content += `This is critical for our ${faker.company.buzzNoun()} initiative.`;
        break;
      
      case 'general':
      default:
        content += `I wanted to reach out regarding ${faker.company.buzzPhrase()}. `;
        content += `Our team has been discussing ${faker.company.catchPhrase()}, `;
        content += `and we think there's an opportunity for ${faker.company.buzzPhrase()}. `;
        content += `Could someone from your team contact me to discuss this further?`;
    }
    
    return content;
  }
  
  /**
   * Save associations to separate files for tracking
   */
  private saveAssociations(tickets: Ticket[]): void {
    const companyAssociations = tickets.map(ticket => ({
      ticketId: ticket.id,
      companyIds: ticket.associations.companies,
      effectiveDate: ticket.properties.neuco_effective_date
    }));
    
    const contactAssociations = tickets.map(ticket => ({
      ticketId: ticket.id,
      contactIds: ticket.associations.contacts,
      effectiveDate: ticket.properties.neuco_effective_date
    }));
    
    this.saveToJson(companyAssociations, 'base/ticket-company-associations.json');
    this.saveToJson(contactAssociations, 'base/ticket-contact-associations.json');
  }
}