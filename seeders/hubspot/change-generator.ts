/**
 * Change Generator
 * 
 * Generates time-based changes to existing entities for HubSpot seeding.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { Company } from './company-generator';
import { Contact } from './contact-generator';
import { Deal } from './deal-generator';
import * as path from 'path';
import * as fs from 'fs-extra';

export interface ChangePattern {
  name: string;
  description: string;
  frequency: number;
  properties?: string[];
  association?: string;
}

export interface ChangeGeneratorOptions extends GeneratorOptions {
  startDate?: Date;
  endDate?: Date;
  intervals?: number;
  companyChanges?: ChangePattern[];
  contactChanges?: ChangePattern[];
  dealChanges?: ChangePattern[];
}

export interface EntityChange {
  id: string;
  entityType: 'company' | 'contact' | 'deal';
  entityId: string;
  changeType: 'property' | 'association';
  timestamp: string;
  neuco_effective_date: string;
  property?: string;
  oldValue?: any;
  newValue?: any;
  associationType?: string;
  associationId?: string;
  action?: 'add' | 'remove';
}

export class ChangeGenerator extends BaseGenerator {
  private startDate: Date;
  private endDate: Date;
  private intervals: number;
  private companyChanges: ChangePattern[];
  private contactChanges: ChangePattern[];
  private dealChanges: ChangePattern[];
  
  private companies: Company[] = [];
  private contacts: Contact[] = [];
  private deals: Deal[] = [];
  private changes: EntityChange[] = [];

  constructor(options: ChangeGeneratorOptions) {
    super(options);
    
    // Set time range for changes
    const defaultStart = new Date();
    defaultStart.setMonth(defaultStart.getMonth() - 6);
    
    this.startDate = options.startDate || defaultStart;
    this.endDate = options.endDate || new Date();
    this.intervals = options.intervals || 5;
    
    // Load change patterns
    this.companyChanges = options.companyChanges || [
      {
        name: 'Growth',
        description: 'Company size/revenue increases',
        frequency: 20,
        properties: ['numberofemployees', 'annualrevenue']
      },
      {
        name: 'LocationChange',
        description: 'Company changes address',
        frequency: 10,
        properties: ['address', 'city', 'state', 'zip']
      }
    ];
    
    this.contactChanges = options.contactChanges || [
      {
        name: 'RoleChange',
        description: 'Contact changes job title/role',
        frequency: 15,
        properties: ['jobtitle']
      },
      {
        name: 'InfoUpdate',
        description: 'Contact details update',
        frequency: 30,
        properties: ['phone', 'email']
      },
      {
        name: 'CompanyTransfer',
        description: 'Contact moves to different company',
        frequency: 5,
        association: 'company'
      }
    ];
    
    this.dealChanges = options.dealChanges || [
      {
        name: 'StageProgression',
        description: 'Deal moves to next stage',
        frequency: 40,
        properties: ['dealstage']
      },
      {
        name: 'ValueAdjustment',
        description: 'Deal amount changes',
        frequency: 25,
        properties: ['amount']
      },
      {
        name: 'StakeholderChange',
        description: 'Deal contacts change',
        frequency: 15,
        association: 'contacts'
      }
    ];
    
    // Load existing data
    this.loadData();
  }

  /**
   * Load existing data from JSON files
   */
  private loadData(): void {
    const orgDir = path.join(this.baseDir, this.organizationId);
    const baseDir = path.join(orgDir, 'base');
    
    if (fs.existsSync(path.join(baseDir, 'companies.json'))) {
      this.companies = fs.readJsonSync(path.join(baseDir, 'companies.json'));
    }
    
    if (fs.existsSync(path.join(baseDir, 'contacts.json'))) {
      this.contacts = fs.readJsonSync(path.join(baseDir, 'contacts.json'));
    }
    
    if (fs.existsSync(path.join(baseDir, 'deals.json'))) {
      this.deals = fs.readJsonSync(path.join(baseDir, 'deals.json'));
    }
  }

  /**
   * Generate changes over time intervals
   */
  public generateChanges(): EntityChange[] {
    this.changes = [];
    
    // Calculate time intervals
    const timeRange = this.endDate.getTime() - this.startDate.getTime();
    const intervalDuration = timeRange / this.intervals;
    
    // Generate changes for each interval
    for (let i = 0; i < this.intervals; i++) {
      const intervalStart = new Date(this.startDate.getTime() + (intervalDuration * i));
      const intervalEnd = new Date(this.startDate.getTime() + (intervalDuration * (i + 1)));
      
      this.generateIntervalChanges(intervalStart, intervalEnd, i);
    }
    
    // Sort changes by effective date
    this.changes.sort((a, b) => 
      new Date(a.neuco_effective_date).getTime() - 
      new Date(b.neuco_effective_date).getTime()
    );
    
    // Save changes to JSON file
    this.saveChanges();
    
    return this.changes;
  }

  /**
   * Generate changes for a specific time interval
   */
  private generateIntervalChanges(startDate: Date, endDate: Date, intervalIndex: number): void {
    // Company changes
    this.companies.forEach(company => {
      if (this.shouldGenerateChange(this.companyChanges)) {
        const changePattern = this.selectChangePattern(this.companyChanges);
        
        if (changePattern.properties) {
          // Property change
          const property = this.pickRandom(changePattern.properties);
          this.generatePropertyChange(
            'company',
            company.id,
            property,
            this.generateNewValue(company.properties[property], property),
            this.getRandomDate(startDate, endDate)
          );
        }
      }
    });
    
    // Contact changes
    this.contacts.forEach(contact => {
      if (this.shouldGenerateChange(this.contactChanges)) {
        const changePattern = this.selectChangePattern(this.contactChanges);
        
        if (changePattern.properties) {
          // Property change
          const property = this.pickRandom(changePattern.properties);
          this.generatePropertyChange(
            'contact',
            contact.id,
            property,
            this.generateNewValue(contact.properties[property], property),
            this.getRandomDate(startDate, endDate)
          );
        } else if (changePattern.association === 'company') {
          // Company association change
          this.generateAssociationChange(
            'contact',
            contact.id,
            'company',
            this.getRandomCompanyId(contact.associations.companies),
            'add',
            this.getRandomDate(startDate, endDate)
          );
        }
      }
    });
    
    // Deal changes
    this.deals.forEach(deal => {
      if (this.shouldGenerateChange(this.dealChanges)) {
        const changePattern = this.selectChangePattern(this.dealChanges);
        
        if (changePattern.properties) {
          // Property change
          const property = this.pickRandom(changePattern.properties);
          
          if (property === 'dealstage') {
            // Special handling for deal stage progression
            this.generateDealStageChange(deal, this.getRandomDate(startDate, endDate));
          } else {
            // Regular property change
            this.generatePropertyChange(
              'deal',
              deal.id,
              property,
              this.generateNewValue(deal.properties[property], property),
              this.getRandomDate(startDate, endDate)
            );
          }
        } else if (changePattern.association === 'contacts') {
          // Contact association change
          const action = this.randomBoolean(0.7) ? 'add' : 'remove';
          
          if (action === 'add' || deal.associations.contacts.length > 1) {
            const contactId = action === 'add' 
              ? this.getRandomContactId(deal.associations.contacts)
              : this.pickRandom(deal.associations.contacts);
              
            this.generateAssociationChange(
              'deal',
              deal.id,
              'contact',
              contactId,
              action,
              this.getRandomDate(startDate, endDate)
            );
          }
        }
      }
    });
  }

  /**
   * Determine if a change should be generated based on patterns
   */
  private shouldGenerateChange(patterns: ChangePattern[]): boolean {
    // Calculate overall change probability based on patterns
    const totalFrequency = patterns.reduce((sum, pattern) => sum + pattern.frequency, 0);
    const averageFrequency = totalFrequency / patterns.length;
    
    // Adjust by a random factor
    return this.random() * 100 < averageFrequency;
  }

  /**
   * Select a change pattern based on frequency
   */
  private selectChangePattern(patterns: ChangePattern[]): ChangePattern {
    const rand = this.random() * 100;
    let cumulativeProbability = 0;
    
    // Normalize frequencies
    const totalFrequency = patterns.reduce((sum, pattern) => sum + pattern.frequency, 0);
    
    for (const pattern of patterns) {
      cumulativeProbability += (pattern.frequency / totalFrequency) * 100;
      if (rand <= cumulativeProbability) {
        return pattern;
      }
    }
    
    return patterns[0]; // Default to first pattern
  }

  /**
   * Generate a property change
   */
  private generatePropertyChange(
    entityType: 'company' | 'contact' | 'deal',
    entityId: string,
    property: string,
    newValue: any,
    timestamp: Date
  ): void {
    // Find old value
    let oldValue: any;
    
    if (entityType === 'company') {
      const company = this.companies.find(c => c.id === entityId);
      oldValue = company?.properties[property];
    } else if (entityType === 'contact') {
      const contact = this.contacts.find(c => c.id === entityId);
      oldValue = contact?.properties[property];
    } else if (entityType === 'deal') {
      const deal = this.deals.find(d => d.id === entityId);
      oldValue = deal?.properties[property];
    }
    
    // Skip if values are the same
    if (oldValue === newValue) {
      return;
    }
    
    // Create change record
    const change: EntityChange = {
      id: this.generateDeterministicId(`change-${entityType}-${entityId}-${property}-${timestamp.getTime()}`),
      entityType,
      entityId,
      changeType: 'property',
      timestamp: timestamp.toISOString(),
      neuco_effective_date: timestamp.toISOString(),
      property,
      oldValue,
      newValue
    };
    
    this.changes.push(change);
  }

  /**
   * Generate an association change
   */
  private generateAssociationChange(
    entityType: 'company' | 'contact' | 'deal',
    entityId: string,
    associationType: string,
    associationId: string,
    action: 'add' | 'remove',
    timestamp: Date
  ): void {
    // Create change record
    const change: EntityChange = {
      id: this.generateDeterministicId(`change-${entityType}-${entityId}-${associationType}-${associationId}-${timestamp.getTime()}`),
      entityType,
      entityId,
      changeType: 'association',
      timestamp: timestamp.toISOString(),
      neuco_effective_date: timestamp.toISOString(),
      associationType,
      associationId,
      action
    };
    
    this.changes.push(change);
  }

  /**
   * Generate a new value for a property
   */
  private generateNewValue(oldValue: any, property: string): any {
    // Handle different property types
    switch (property) {
      case 'numberofemployees':
        // Increase by 10-30%
        return Math.round(oldValue * (1 + this.getRandomInt(10, 30) / 100));
      
      case 'annualrevenue':
        // Increase by 5-25%
        return Math.round(oldValue * (1 + this.getRandomInt(5, 25) / 100));
      
      case 'jobtitle':
        // Change job title
        const titles = [
          'CEO', 'CTO', 'CFO', 'COO', 'VP of Sales', 'VP of Marketing', 
          'Director of Engineering', 'Engineering Manager', 'Product Manager', 
          'Sales Manager', 'Marketing Manager', 'Operations Manager'
        ];
        return this.pickRandom(titles.filter(t => t !== oldValue));
      
      case 'phone':
        // Generate new phone number
        const area = this.getRandomInt(200, 999).toString();
        const prefix = this.getRandomInt(200, 999).toString();
        const line = this.getRandomInt(1000, 9999).toString();
        return `(${area}) ${prefix}-${line}`;
      
      case 'email':
        // Change email domain
        const emailParts = oldValue.split('@');
        const domains = ['example.com', 'newdomain.com', 'business.net', 'corporate.org'];
        return `${emailParts[0]}@${this.pickRandom(domains.filter(d => d !== emailParts[1] || domains.length === 1))}`;
      
      case 'amount':
        // Adjust deal amount by -10% to +20%
        const adjustmentFactor = 1 + (this.getRandomInt(-10, 20) / 100);
        return Math.round(oldValue * adjustmentFactor);
      
      default:
        return oldValue;
    }
  }

  /**
   * Generate a deal stage change
   */
  private generateDealStageChange(deal: Deal, timestamp: Date): void {
    const stages = [
      'Qualification',
      'Meeting Scheduled',
      'Proposal',
      'Negotiation',
      'Closed Won',
      'Closed Lost'
    ];
    
    const currentStageIndex = stages.indexOf(deal.properties.dealstage);
    
    if (currentStageIndex === -1 || currentStageIndex >= stages.length - 1) {
      return; // Invalid stage or already at last stage
    }
    
    // Determine new stage (usually advance, but can go back in some cases)
    let newStageIndex: number;
    
    if (this.randomBoolean(0.9)) {
      // Advance to next stage (90% chance)
      newStageIndex = currentStageIndex + 1;
    } else {
      // Go back a stage (10% chance)
      newStageIndex = Math.max(0, currentStageIndex - 1);
    }
    
    // Special case: Don't randomly move from won to lost or vice versa
    if ((currentStageIndex === stages.length - 2 && newStageIndex === stages.length - 1) ||
        (currentStageIndex === stages.length - 1 && newStageIndex === stages.length - 2)) {
      return;
    }
    
    // Generate the change
    this.generatePropertyChange(
      'deal',
      deal.id,
      'dealstage',
      stages[newStageIndex],
      timestamp
    );
  }

  /**
   * Get a random company ID that's not in the exclude list
   */
  private getRandomCompanyId(exclude: string[] = []): string {
    // Filter out excluded companies
    const availableCompanies = this.companies.filter(c => !exclude.includes(c.id));
    
    if (availableCompanies.length === 0) {
      return this.companies[0].id; // Fallback if all excluded
    }
    
    return this.pickRandom(availableCompanies).id;
  }

  /**
   * Get a random contact ID that's not in the exclude list
   */
  private getRandomContactId(exclude: string[] = []): string {
    // Filter out excluded contacts
    const availableContacts = this.contacts.filter(c => !exclude.includes(c.id));
    
    if (availableContacts.length === 0) {
      return this.contacts[0].id; // Fallback if all excluded
    }
    
    return this.pickRandom(availableContacts).id;
  }

  /**
   * Save changes to JSON file
   */
  private saveChanges(): void {
    // Group changes by day for easier processing
    const changesByDay: { [date: string]: EntityChange[] } = {};
    
    this.changes.forEach(change => {
      const date = change.neuco_effective_date.substring(0, 10); // YYYY-MM-DD
      
      if (!changesByDay[date]) {
        changesByDay[date] = [];
      }
      
      changesByDay[date].push(change);
    });
    
    // Save each day's changes to a separate file
    Object.entries(changesByDay).forEach(([date, changes]) => {
      this.saveToJson(changes, `changes/changes_${date}.json`);
    });
    
    // Also save all changes to a single file
    this.saveToJson(this.changes, 'changes/all_changes.json');
  }
}