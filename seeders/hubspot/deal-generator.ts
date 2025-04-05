/**
 * Deal Generator
 * 
 * Generates realistic deal data for HubSpot seeding with company and contact associations.
 * Uses Faker.js for realistic data generation.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { Company } from './company-generator';
import { Contact } from './contact-generator';
import { HubSpotSchemaLoader } from './hubspot-schema-loader';
import { faker } from '@faker-js/faker';

export interface DealDistribution {
  byCompanySize: {
    [size: string]: { min: number; max: number };
  };
  byStage: {
    [stage: string]: number;
  };
}

export interface DealValueRanges {
  [companySize: string]: { min: number; max: number };
}

export interface DealProgressionPattern {
  name: string;
  description: string;
  probability: number;
  stageTransitionDays: {
    [stage: string]: { min: number; max: number };
  };
}

export interface DealGeneratorOptions extends GeneratorOptions {
  companies: Company[];
  contacts: Contact[];
  distribution?: DealDistribution;
  valueRanges?: DealValueRanges;
  progressionPatterns?: DealProgressionPattern[];
  pipelineName?: string;
}

export interface Deal {
  id: string;
  hubspotId?: string;
  properties: {
    dealname: string;
    amount: number;
    dealstage: string;
    pipeline?: string;
    closedate?: string;
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

export class DealGenerator extends BaseGenerator {
  private companies: Company[];
  private contacts: Contact[];
  private distribution: DealDistribution;
  private valueRanges: DealValueRanges;
  private progressionPatterns: DealProgressionPattern[];
  private pipelineName: string;
  private hubspotSchema: HubSpotSchemaLoader;
  
  // HubSpot-specific deal stages
  private hubspotStages: string[] = [
    'appointmentscheduled',
    'qualifiedtobuy',
    'presentationscheduled',
    'decisionmakerboughtin',
    'closedwon',
    'closedlost'
  ];

  // Deal name prefixes by industry
  private dealNamePrefixes: { [industry: string]: string[] } = {
    'COMPUTER_SOFTWARE': [
      'Software License', 'Cloud Subscription', 'API Integration', 'Enterprise Platform',
      'Development Tools', 'SaaS Implementation', 'Data Migration', 'Technical Support'
    ],
    'HOSPITAL_HEALTH_CARE': [
      'Medical Equipment', 'Healthcare Solution', 'Patient Management', 'Clinical Workflow',
      'Health Records System', 'Telehealth Platform', 'Medical Staffing', 'Compliance Solution'
    ],
    'FINANCIAL_SERVICES': [
      'Financial Advisory', 'Wealth Management', 'Investment Portfolio', 'Banking Solution',
      'Risk Assessment', 'Insurance Package', 'Payment Processing', 'Loan Origination'
    ],
    'INFORMATION_TECHNOLOGY_AND_SERVICES': [
      'IT Infrastructure', 'Network Setup', 'Managed Services', 'Security Implementation',
      'Cloud Migration', 'Hardware Upgrade', 'Disaster Recovery', 'Tech Consulting'
    ],
    'RETAIL': [
      'Inventory System', 'POS Solution', 'E-commerce Platform', 'Retail Analytics',
      'Customer Loyalty', 'Supply Chain', 'Digital Storefront', 'Merchandising Tools'
    ],
    'EDUCATION_MANAGEMENT': [
      'Learning Platform', 'Student Management', 'Educational Content', 'Academic Training',
      'Assessment Tools', 'Classroom Technology', 'Administrative System', 'Career Services'
    ],
    'MANAGEMENT_CONSULTING': [
      'Strategic Consulting', 'Process Optimization', 'Change Management', 'Organizational Design',
      'Business Analysis', 'Executive Coaching', 'Performance Improvement', 'Transformation Project'
    ],
    'MARKETING_AND_ADVERTISING': [
      'Marketing Campaign', 'Brand Strategy', 'Digital Advertising', 'Content Production',
      'Social Media Management', 'SEO Services', 'Market Research', 'Creative Services'
    ]
  };

  constructor(options: DealGeneratorOptions) {
    super(options);
    this.companies = options.companies;
    this.contacts = options.contacts;
    this.pipelineName = options.pipelineName || 'default';
    this.hubspotSchema = new HubSpotSchemaLoader();
    
    // Default distribution if not provided
    this.distribution = options.distribution || {
      byCompanySize: {
        // For minimal test data, just 1 deal per company
        'Small': { min: 1, max: 1 },
        'Medium': { min: 1, max: 1 },
        'Large': { min: 1, max: 1 },
        'Enterprise': { min: 1, max: 1 }
      },
      byStage: {
        // Create one deal for each stage to test all stages
        'appointmentscheduled': 30,
        'qualifiedtobuy': 20,
        'presentationscheduled': 20,
        'decisionmakerboughtin': 20,
        'closedwon': 5,
        'closedlost': 5
      }
    };
    
    // Default value ranges if not provided
    this.valueRanges = options.valueRanges || {
      'Small': { min: 1000, max: 10000 },
      'Medium': { min: 5000, max: 25000 },
      'Large': { min: 20000, max: 100000 },
      'Enterprise': { min: 50000, max: 500000 }
    };
    
    // Default progression patterns if not provided
    this.progressionPatterns = options.progressionPatterns || [
      {
        name: 'FastClose',
        description: 'Deals that move quickly through the pipeline',
        probability: 20,
        stageTransitionDays: {
          'appointmentscheduled': { min: 1, max: 3 },
          'qualifiedtobuy': { min: 1, max: 5 },
          'presentationscheduled': { min: 2, max: 7 },
          'decisionmakerboughtin': { min: 1, max: 5 }
        }
      },
      {
        name: 'StandardSales',
        description: 'Normal sales cycle',
        probability: 60,
        stageTransitionDays: {
          'appointmentscheduled': { min: 5, max: 14 },
          'qualifiedtobuy': { min: 7, max: 21 },
          'presentationscheduled': { min: 7, max: 30 },
          'decisionmakerboughtin': { min: 7, max: 21 }
        }
      },
      {
        name: 'SlowBurn',
        description: 'Long sales cycles',
        probability: 20,
        stageTransitionDays: {
          'appointmentscheduled': { min: 14, max: 30 },
          'qualifiedtobuy': { min: 21, max: 45 },
          'presentationscheduled': { min: 30, max: 60 },
          'decisionmakerboughtin': { min: 14, max: 45 }
        }
      }
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
   * Generate deals for companies
   */
  public generateDeals(): Deal[] {
    const deals: Deal[] = [];
    const now = new Date();
    let dealIndex = 0;
    
    // Get deal pipelines and ensure we have a valid pipeline ID
    const pipelines = this.hubspotSchema.getDealPipelines();
    const defaultPipeline = pipelines.find(p => p.id === this.pipelineName) || pipelines[0];
    const pipelineId = defaultPipeline?.id || 'default';
    
    // Generate deals for each company
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
      faker.seed(this.getSeedNumber(`${company.id}-deals`));
      
      // Determine number of deals based on company size
      const sizeDistribution = this.distribution.byCompanySize[sizeCategory];
      const dealCount = this.getRandomInt(sizeDistribution.min, sizeDistribution.max);
      
      // Get the industry for deal type generation
      const industry = company.properties.industry || 'COMPUTER_SOFTWARE';
      
      // Generate deals
      for (let i = 0; i < dealCount; i++) {
        // Seed faker for this specific deal to ensure deterministic but varied results
        faker.seed(this.getSeedNumber(`${company.id}-deal-${i}`));
        
        // Select between 1-3 contacts for this deal
        const contactCount = this.getRandomInt(1, Math.min(3, companyContacts.length));
        const dealContacts = this.selectRandomContacts(companyContacts, contactCount);
        
        // Select a progression pattern
        const progressionPattern = this.selectProgressionPattern();
        
        // Select a stage based on distribution
        const stage = this.selectStageByDistribution();
        
        // Create deterministic ID
        const id = this.generateDeterministicId(`${company.id}-deal-${dealIndex++}`);
        
        // Create deal with effective date after company creation
        const companyEffectiveDate = new Date(company.properties.neuco_effective_date);
        const dealEffectiveDate = new Date(companyEffectiveDate);
        // Add random days (15-60) to company effective date
        dealEffectiveDate.setDate(dealEffectiveDate.getDate() + this.getRandomInt(15, 60));
        
        // Calculate close date based on stage and progression pattern
        const closeDate = this.calculateCloseDate(dealEffectiveDate, stage, progressionPattern);
        
        // Generate a realistic amount based on company size
        const valueRange = this.valueRanges[sizeCategory];
        const amount = this.getRandomInt(valueRange.min, valueRange.max);
        
        // Format dates according to HubSpot requirements (milliseconds since epoch)
        const closeDateTimestamp = closeDate.getTime();
        const effectiveDateTimestamp = dealEffectiveDate.getTime();
        
        // Calculate stage probability (we'll store this in our own properties)
        let probability = 0;
        switch(stage) {
          case 'appointmentscheduled': probability = 20; break;
          case 'qualifiedtobuy': probability = 40; break;
          case 'presentationscheduled': probability = 60; break;
          case 'decisionmakerboughtin': probability = 80; break;
          case 'closedwon': probability = 100; break;
          case 'closedlost': probability = 0; break;
          default: probability = 50;
        }
        
        // Calculate stage transition dates (for our internal Neuco tracking)
        const stageEnteredDate = effectiveDateTimestamp;
        const stageExitedDate = stage !== 'appointmentscheduled' ? 
          (effectiveDateTimestamp + (86400000 * this.getRandomInt(1, 10))) : null;
        
        // Create a realistic deal name
        const dealName = this.generateDealName(company.properties.name, industry, stage);
        
        // Create the deal with HubSpot-specific properties
        const deal: Deal = {
          id,
          properties: {
            dealname: dealName,
            amount,
            dealstage: stage,
            pipeline: pipelineId,
            closedate: closeDateTimestamp.toString(), // HubSpot format: milliseconds since epoch
            createdate: effectiveDateTimestamp.toString(), // HubSpot format: milliseconds since epoch
            
            // Neuco-specific fields for our internal tracking
            neuco_stage_probability: probability.toString(),
            neuco_stage_entered_date: stageEnteredDate.toString(),
            neuco_stage_exited_date: stageExitedDate ? stageExitedDate.toString() : null,
            neuco_effective_date: dealEffectiveDate.toISOString() // Our custom ISO format date for time travel
          },
          associations: {
            companies: [company.id],
            contacts: dealContacts.map(c => c.id)
          },
          createdAt: dealEffectiveDate.toISOString(),
          updatedAt: dealEffectiveDate.toISOString()
        };
        
        deals.push(deal);
      }
    });
    
    // Sort deals by effective date
    deals.sort((a, b) => 
      new Date(a.properties.neuco_effective_date).getTime() - 
      new Date(b.properties.neuco_effective_date).getTime()
    );
    
    // Save to JSON
    this.saveToJson(deals, 'base/deals.json');
    
    // Also save associations to separate files for tracking
    this.saveAssociations(deals);
    
    return deals;
  }
  
  /**
   * Select random contacts from a list
   */
  private selectRandomContacts(contacts: Contact[], count: number): Contact[] {
    // Copy the array to avoid modifying the original
    const contactsCopy = [...contacts];
    const selected: Contact[] = [];
    
    for (let i = 0; i < count; i++) {
      if (contactsCopy.length === 0) break;
      
      const index = Math.floor(this.random() * contactsCopy.length);
      selected.push(contactsCopy[index]);
      contactsCopy.splice(index, 1);
    }
    
    return selected;
  }
  
  /**
   * Select a progression pattern based on probability
   */
  private selectProgressionPattern(): DealProgressionPattern {
    const rand = this.random() * 100;
    let cumulativeProbability = 0;
    
    for (const pattern of this.progressionPatterns) {
      cumulativeProbability += pattern.probability;
      if (rand <= cumulativeProbability) {
        return pattern;
      }
    }
    
    return this.progressionPatterns[0]; // Default to first pattern
  }
  
  /**
   * Select a stage based on distribution
   */
  private selectStageByDistribution(): string {
    const rand = this.random() * 100;
    let cumulativeProbability = 0;
    
    // Use HubSpot stage IDs directly
    for (const stage of this.hubspotStages) {
      cumulativeProbability += this.distribution.byStage[stage] || 0;
      if (rand <= cumulativeProbability) {
        return stage;
      }
    }
    
    return this.hubspotStages[0]; // Default to first stage
  }
  
  /**
   * Calculate close date based on stage and progression pattern
   */
  private calculateCloseDate(startDate: Date, currentStage: string, pattern: DealProgressionPattern): Date {
    const closeDate = new Date(startDate);
    const currentStageIndex = this.hubspotStages.indexOf(currentStage);
    
    // Add days for each stage transition up to the current stage
    for (let i = 0; i < currentStageIndex; i++) {
      const hubspotStage = this.hubspotStages[i];
      const transitionDays = pattern.stageTransitionDays[hubspotStage];
      
      if (transitionDays) {
        closeDate.setDate(closeDate.getDate() + this.getRandomInt(transitionDays.min, transitionDays.max));
      } else {
        // Default if not specified in the pattern
        closeDate.setDate(closeDate.getDate() + this.getRandomInt(7, 14));
      }
    }
    
    // For won/lost deals, add a final transition time
    if (currentStage === 'closedwon' || currentStage === 'closedlost') {
      const negotiationDays = pattern.stageTransitionDays['decisionmakerboughtin'];
      if (negotiationDays) {
        closeDate.setDate(closeDate.getDate() + this.getRandomInt(negotiationDays.min, negotiationDays.max));
      } else {
        closeDate.setDate(closeDate.getDate() + this.getRandomInt(7, 14));
      }
    } else {
      // For open deals, close date is in the future
      const now = new Date();
      if (closeDate < now) {
        // Add days to make it in the future
        const daysToAdd = this.getRandomInt(7, 90);
        closeDate.setDate(now.getDate() + daysToAdd);
      }
    }
    
    return closeDate;
  }
  
  /**
   * Generate a realistic deal name
   */
  private generateDealName(companyName: string, industry: string, stage: string): string {
    // Get industry-specific deal prefixes
    const prefixes = this.dealNamePrefixes[industry] || this.dealNamePrefixes['COMPUTER_SOFTWARE'];
    
    // Generate a believable deal name
    const dealPrefix = faker.helpers.arrayElement(prefixes);
    const year = new Date().getFullYear();
    
    // Add suffix based on deal stage
    let suffix = '';
    if (stage === 'closedwon') {
      suffix = ' - CLOSED WON';
    } else if (stage === 'closedlost') {
      suffix = ' - CLOSED LOST';
    } else if (stage === 'appointmentscheduled') {
      suffix = ' - NEW';
    }
    
    return `${dealPrefix} - ${companyName}${suffix}`;
  }
  
  /**
   * Save associations to separate files for tracking
   */
  private saveAssociations(deals: Deal[]): void {
    const companyAssociations = deals.map(deal => ({
      dealId: deal.id,
      companyIds: deal.associations.companies,
      effectiveDate: deal.properties.neuco_effective_date
    }));
    
    const contactAssociations = deals.map(deal => ({
      dealId: deal.id,
      contactIds: deal.associations.contacts,
      effectiveDate: deal.properties.neuco_effective_date
    }));
    
    this.saveToJson(companyAssociations, 'base/deal-company-associations.json');
    this.saveToJson(contactAssociations, 'base/deal-contact-associations.json');
  }
}