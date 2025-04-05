/**
 * Task Generator
 * 
 * Generates realistic task engagement data for HubSpot with associations to companies, contacts, deals, and tickets.
 * Uses Faker.js for realistic data generation.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { Company } from './company-generator';
import { Contact } from './contact-generator';
import { Deal } from './deal-generator';
import { Ticket } from './ticket-generator';
import { faker } from '@faker-js/faker';

export interface TaskDistribution {
  byCompanySize: {
    [size: string]: { min: number; max: number };
  };
  byDealStage: {
    [stage: string]: { min: number; max: number };
  };
  byTicketStatus: {
    [status: string]: { min: number; max: number };
  };
  byStatus: {
    [status: string]: number;
  };
}

export interface TaskGeneratorOptions extends GeneratorOptions {
  companies: Company[];
  contacts: Contact[];
  deals?: Deal[];
  tickets?: Ticket[];
  distribution?: TaskDistribution;
}

export interface Task {
  id: string;
  hubspotId?: string;
  properties: {
    hs_task_subject: string;
    hs_task_body: string;
    hs_task_status: string;
    hs_task_priority: string;
    hs_task_type: string;
    hs_timestamp?: string;
    neuco_task_due_date: string;     // Custom property instead of hs_task_due_date
    neuco_task_reminder_time: string; // Custom property instead of hs_task_reminder_time
    neuco_effective_date: string;     // For time travel functionality
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

export class TaskGenerator extends BaseGenerator {
  private companies: Company[];
  private contacts: Contact[];
  private deals: Deal[];
  private tickets: Ticket[];
  private distribution: TaskDistribution;
  
  // HubSpot task types - all valid types from the API
  private taskTypes: string[] = [
    'CALL',
    'EMAIL',
    'LINKED_IN',
    'MEETING',
    'LINKED_IN_CONNECT',
    'LINKED_IN_MESSAGE',
    'TODO'
  ];
  
  // HubSpot task priorities
  private taskPriorities: string[] = [
    'HIGH',
    'MEDIUM',
    'LOW'
  ];
  
  // HubSpot task statuses
  private taskStatuses: string[] = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'WAITING',
    'COMPLETED',
    'DEFERRED'
  ];
  
  // Task subject templates by context
  private taskSubjectTemplates: { [context: string]: string[] } = {
    'deal': [
      'Follow up with {contact} about {product} proposal',
      'Send pricing information to {contact}',
      'Schedule demo with {company} team',
      'Prepare presentation for {company}',
      'Finalize contract details with {contact}',
      'Conduct negotiation call with {company} decision makers',
      'Internal review of {company} requirements',
      'Secure final approval from {contact}'
    ],
    'ticket': [
      'Investigate issue reported by {contact}',
      'Provide solution to {company} technical problem',
      'Update {contact} on ticket status',
      'Escalate {company} issue to engineering team',
      'Verify resolution with {contact}',
      'Document solution for {company} support case',
      'Collect additional information from {contact}',
      'Close resolved ticket with {company}'
    ],
    'contact': [
      'Introductory call with {contact}',
      'Research {contact}\'s background',
      'Add {contact} to newsletter',
      'Connect with {contact} on LinkedIn',
      'Schedule check-in with {contact}',
      'Update {contact}\'s information',
      'Send welcome email to {contact}',
      'Qualify {contact} for sales process'
    ],
    'company': [
      'Research {company} organization',
      'Identify key stakeholders at {company}',
      'Prepare account plan for {company}',
      'Analyze {company} current solutions',
      'Develop proposal for {company}',
      'Review {company} history with our products',
      'Map {company} decision-making process',
      'Create competitive analysis for {company} opportunity'
    ]
  };
  
  // Task contexts for distribution
  private taskContexts: string[] = ['deal', 'ticket', 'contact', 'company'];
  
  constructor(options: TaskGeneratorOptions) {
    super(options);
    this.companies = options.companies;
    this.contacts = options.contacts;
    this.deals = options.deals || [];
    this.tickets = options.tickets || [];
    
    // Default distribution if not provided
    this.distribution = options.distribution || {
      byCompanySize: {
        // For minimal test data, just 1 task per company
        'Small': { min: 1, max: 1 },
        'Medium': { min: 1, max: 1 },
        'Large': { min: 1, max: 1 },
        'Enterprise': { min: 1, max: 1 }
      },
      byDealStage: {
        // One task for each deal stage
        'appointmentscheduled': { min: 1, max: 1 },
        'qualifiedtobuy': { min: 1, max: 1 },
        'presentationscheduled': { min: 1, max: 1 },
        'decisionmakerboughtin': { min: 1, max: 1 },
        'closedwon': { min: 1, max: 1 },
        'closedlost': { min: 1, max: 1 }
      },
      byTicketStatus: {
        // One task for each ticket status
        'NEW': { min: 1, max: 1 },
        'WAITING_ON_CONTACT': { min: 1, max: 1 },
        'WAITING_ON_US': { min: 1, max: 1 },
        'CLOSED': { min: 1, max: 1 }
      },
      byStatus: {
        // Even distribution of task statuses
        'NOT_STARTED': 20,
        'IN_PROGRESS': 20,
        'WAITING': 20,
        'COMPLETED': 20,
        'DEFERRED': 20
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
   * Generate tasks for all entities
   */
  public generateTasks(): Task[] {
    const tasks: Task[] = [];
    let taskIndex = 0;
    
    // Generate company and contact tasks
    this.companies.forEach(company => {
      // Set faker seed for this company
      faker.seed(this.getSeedNumber(`${company.id}-tasks`));
      
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
      
      // Determine number of tasks based on company size
      const sizeDistribution = this.distribution.byCompanySize[sizeCategory];
      const companyTaskCount = this.getRandomInt(sizeDistribution.min, sizeDistribution.max);
      
      // Generate company tasks
      for (let i = 0; i < companyTaskCount; i++) {
        // Create a company task
        const task = this.createTask(
          `${company.id}-task-${taskIndex++}`,
          'company',
          company,
          this.pickRandom(companyContacts),
          null,
          null
        );
        tasks.push(task);
      }
      
      // Generate contact tasks
      companyContacts.forEach(contact => {
        // Only create tasks for some contacts (randomly)
        if (this.randomBoolean(0.6)) { // 60% chance
          const contactTaskCount = this.getRandomInt(1, 3);
          
          for (let i = 0; i < contactTaskCount; i++) {
            // Create a contact task
            const task = this.createTask(
              `${contact.id}-task-${taskIndex++}`,
              'contact',
              company,
              contact,
              null,
              null
            );
            tasks.push(task);
          }
        }
      });
    });
    
    // Generate deal tasks
    if (this.deals.length > 0) {
      this.deals.forEach(deal => {
        // Set faker seed for this deal
        faker.seed(this.getSeedNumber(`${deal.id}-tasks`));
        
        // Determine number of tasks based on deal stage
        const stage = deal.properties.dealstage;
        const stageDistribution = this.distribution.byDealStage[stage] || { min: 1, max: 3 };
        const dealTaskCount = this.getRandomInt(stageDistribution.min, stageDistribution.max);
        
        // Get associated company and contacts
        const companyId = deal.associations.companies[0];
        const company = this.companies.find(c => c.id === companyId);
        
        if (!company) return; // Skip if company not found
        
        const contactIds = deal.associations.contacts;
        const contacts = this.contacts.filter(c => contactIds.includes(c.id));
        
        if (contacts.length === 0) return; // Skip if no contacts
        
        // Generate deal tasks
        for (let i = 0; i < dealTaskCount; i++) {
          // Create a deal task
          const task = this.createTask(
            `${deal.id}-task-${taskIndex++}`,
            'deal',
            company,
            this.pickRandom(contacts),
            deal,
            null
          );
          tasks.push(task);
        }
      });
    }
    
    // Generate ticket tasks
    if (this.tickets.length > 0) {
      this.tickets.forEach(ticket => {
        // Set faker seed for this ticket
        faker.seed(this.getSeedNumber(`${ticket.id}-tasks`));
        
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
        
        // Determine number of tasks based on ticket status
        const statusDistribution = this.distribution.byTicketStatus[statusName] || { min: 1, max: 2 };
        const ticketTaskCount = this.getRandomInt(statusDistribution.min, statusDistribution.max);
        
        // Get associated company and contact
        const companyId = ticket.associations.companies[0];
        const company = this.companies.find(c => c.id === companyId);
        
        if (!company) return; // Skip if company not found
        
        const contactId = ticket.associations.contacts[0];
        const contact = this.contacts.find(c => c.id === contactId);
        
        if (!contact) return; // Skip if contact not found
        
        // Generate ticket tasks
        for (let i = 0; i < ticketTaskCount; i++) {
          // Create a ticket task
          const task = this.createTask(
            `${ticket.id}-task-${taskIndex++}`,
            'ticket',
            company,
            contact,
            null,
            ticket
          );
          tasks.push(task);
        }
      });
    }
    
    // Sort tasks by effective date
    tasks.sort((a, b) => 
      new Date(a.properties.neuco_effective_date).getTime() - 
      new Date(b.properties.neuco_effective_date).getTime()
    );
    
    // Save to JSON
    this.saveToJson(tasks, 'base/tasks.json');
    
    return tasks;
  }
  
  /**
   * Create a task with appropriate associations
   */
  private createTask(
    idBase: string,
    context: string,
    company: Company,
    contact: Contact,
    deal: Deal | null = null,
    ticket: Ticket | null = null
  ): Task {
    // Create deterministic ID
    const id = this.generateDeterministicId(idBase);
    
    // Get entity creation dates to ensure task is created after entities
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
    const taskDate = new Date(latestEntityDate);
    taskDate.setDate(taskDate.getDate() + this.getRandomInt(1, 15));
    
    // Ensure task date is not in the future
    const now = new Date();
    if (taskDate > now) {
      taskDate.setTime(now.getTime() - this.getRandomInt(1, 15) * 24 * 60 * 60 * 1000);
    }
    
    // Format dates according to HubSpot requirements (milliseconds since epoch)
    const effectiveDateTimestamp = taskDate.getTime();
    
    // Set due date (1-14 days from task creation)
    const dueDate = new Date(taskDate);
    dueDate.setDate(dueDate.getDate() + this.getRandomInt(1, 14));
    const dueDateTimestamp = dueDate.getTime();
    
    // Set reminder time (1 day before due date)
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    const reminderTimestamp = reminderDate.getTime();
    
    // Select task type, priority, and status
    const taskType = this.pickRandom(this.taskTypes);
    const taskPriority = this.pickRandom(this.taskPriorities);
    const taskStatus = this.selectStatusByDistribution();
    
    // Generate task subject and body
    const variables = {
      company: company.properties.name,
      contact: `${contact.properties.firstname} ${contact.properties.lastname}`,
      product: faker.commerce.productName()
    };
    
    const taskSubject = this.generateTaskSubject(context, variables);
    const taskBody = this.generateTaskBody(context, taskType, variables);
    
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
    
    // Create the task
    const task: Task = {
      id,
      properties: {
        hs_task_subject: taskSubject,
        hs_task_body: taskBody,
        hs_task_status: taskStatus,
        hs_task_priority: taskPriority,
        hs_task_type: taskType,
        hs_timestamp: effectiveDateTimestamp.toString(), // Creation time
        neuco_effective_date: taskDate.toISOString(), // Our custom ISO format date for time travel
        neuco_task_due_date: dueDateTimestamp.toString(), // Our custom due date property
        neuco_task_reminder_time: reminderTimestamp.toString() // Our custom reminder time property
      },
      associations,
      createdAt: taskDate.toISOString(),
      updatedAt: taskDate.toISOString()
    };
    
    return task;
  }
  
  /**
   * Select a status based on distribution
   */
  private selectStatusByDistribution(): string {
    const rand = this.random() * 100;
    let cumulativeProbability = 0;
    
    // Use HubSpot status values directly
    for (const status of this.taskStatuses) {
      cumulativeProbability += this.distribution.byStatus[status] || 0;
      if (rand <= cumulativeProbability) {
        return status;
      }
    }
    
    return this.taskStatuses[0]; // Default to first status
  }
  
  /**
   * Generate task subject from template
   */
  private generateTaskSubject(context: string, variables: Record<string, any>): string {
    // Get templates for the given context
    const templates = this.taskSubjectTemplates[context] || this.taskSubjectTemplates['company'];
    
    // Select a random template
    let template = this.pickRandom(templates);
    
    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      template = template.replace(`{${key}}`, value);
    }
    
    return template;
  }
  
  /**
   * Generate task body
   */
  private generateTaskBody(context: string, taskType: string, variables: Record<string, any>): string {
    const company = variables.company;
    const contact = variables.contact;
    const product = variables.product;
    
    let body = '';
    
    switch(taskType) {
      case 'CALL':
        body = `Call ${contact} ${this.randomBoolean(0.7) ? `at ${faker.phone.number('(###) ###-####')}` : ''} `;
        
        switch(context) {
          case 'deal':
            body += `to discuss ${product} proposal. Review pricing options and implementation timeline.`;
            break;
          case 'ticket':
            body += `to gather additional details about the reported issue and validate potential solutions.`;
            break;
          case 'contact':
            body += `for initial qualification and needs assessment.`;
            break;
          case 'company':
          default:
            body += `to discuss potential opportunities with ${company}.`;
            break;
        }
        break;
        
      case 'EMAIL':
        body = `Send email to ${contact} `;
        
        switch(context) {
          case 'deal':
            body += `with formal proposal including pricing for ${product} and implementation services.`;
            break;
          case 'ticket':
            body += `with troubleshooting steps and request for additional information.`;
            break;
          case 'contact':
            body += `with introduction and relevant resources. Request time for initial call.`;
            break;
          case 'company':
          default:
            body += `regarding potential solutions for ${company}'s needs.`;
            break;
        }
        break;
        
      case 'MEETING':
        body = `Schedule meeting with ${contact} `;
        
        switch(context) {
          case 'deal':
            body += `and key stakeholders for ${product} demo presentation.`;
            break;
          case 'ticket':
            body += `to walk through resolution steps and validate fix.`;
            break;
          case 'contact':
            body += `to discuss their role and requirements.`;
            break;
          case 'company':
          default:
            body += `to present our solutions to ${company} team.`;
            break;
        }
        break;
        
      case 'TODO':
      default:
        body = `Complete follow-up with ${contact} from ${company}. `;
        
        switch(context) {
          case 'deal':
            body += `Ensure all requirements for ${product} implementation are documented and approved.`;
            break;
          case 'ticket':
            body += `Verify that the reported issue has been properly addressed and ticket can be closed.`;
            break;
          case 'contact':
            body += `Update contact record with all relevant information from recent interactions.`;
            break;
          case 'company':
          default:
            body += `Update account plan with recent findings and next steps.`;
            break;
        }
        break;
    }
    
    return body;
  }
}