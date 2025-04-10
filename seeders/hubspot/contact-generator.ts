/**
 * Contact Generator
 * 
 * Generates realistic contact data for HubSpot seeding with company associations.
 * Uses Faker.js to generate diverse, realistic data.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { Company } from './company-generator';
import { faker } from '@faker-js/faker';

export interface ContactDistribution {
  byCompanySize: {
    [size: string]: { min: number; max: number };
  };
  byRole: {
    [role: string]: number;
  };
}

export interface ContactGeneratorOptions extends GeneratorOptions {
  companies: Company[];
  distribution?: ContactDistribution;
}

export interface Contact {
  id: string;
  hubspotId?: string;
  properties: {
    email: string;
    firstname: string;
    lastname: string;
    jobtitle?: string;
    phone?: string;
    lifecyclestage?: string;
    company?: string;
    neuco_effective_date: string;
    [key: string]: any;
  };
  associations: {
    companies: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export class ContactGenerator extends BaseGenerator {
  private companies: Company[];
  private distribution: ContactDistribution;
  
  // HubSpot lifecycle stages - lowercase to match HubSpot's requirements
  private lifecycleStages: string[] = [
    'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 
    'opportunity', 'customer', 'evangelist', 'subscriber'
  ];

  // Role categories
  private roleCategories = {
    executive: [
      'CEO', 'President', 'CTO', 'CFO', 'COO', 'VP of Sales', 'VP of Marketing', 
      'Chief Revenue Officer', 'Chief Marketing Officer', 'VP of Operations',
      'Chief Customer Officer', 'VP of Product', 'VP of Engineering'
    ],
    management: [
      'Engineering Manager', 'Product Manager', 'Marketing Manager', 'Sales Manager', 
      'Operations Manager', 'Project Manager', 'HR Manager', 'IT Manager',
      'Customer Success Manager', 'Account Manager', 'Regional Director',
      'Team Lead', 'Department Head', 'District Manager'
    ],
    individual: [
      'Software Engineer', 'Account Executive', 'Marketing Specialist', 'Business Analyst', 
      'Designer', 'Customer Support Specialist', 'Sales Representative', 'Accountant',
      'Data Scientist', 'Content Writer', 'UX Researcher', 'QA Engineer',
      'Developer', 'Technical Writer', 'HR Specialist', 'Administrative Assistant'
    ]
  };

  constructor(options: ContactGeneratorOptions) {
    super(options);
    this.companies = options.companies;
    this.distribution = options.distribution || {
      byCompanySize: {
        // For minimal test data, just create 1-2 contacts per company regardless of size
        'Small': { min: 1, max: 2 },
        'Medium': { min: 1, max: 2 },
        'Large': { min: 1, max: 2 },
        'Enterprise': { min: 1, max: 2 }
      },
      byRole: {
        // Ensure we have at least one executive (for testing deal generation)
        'executive': 50,
        'management': 30,
        'individual': 20
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
   * Generate contacts for companies
   */
  public generateContacts(): Contact[] {
    const contacts: Contact[] = [];
    let globalContactIndex = 0;
    
    // Generate contacts for each company
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
      
      // Determine number of contacts based on company size
      const sizeDistribution = this.distribution.byCompanySize[sizeCategory];
      const contactCount = this.getRandomInt(sizeDistribution.min, sizeDistribution.max);
      
      // Generate contacts
      for (let i = 0; i < contactCount; i++) {
        // Determine role type
        const roleType = this.getRoleTypeByDistribution();
        
        // Create deterministic ID based on company and contact index
        const id = this.generateDeterministicId(`${company.id}-contact-${i}`);
        
        // Create contact with effective date close to but not exactly company date
        const companyEffectiveDate = new Date(company.properties.neuco_effective_date);
        const contactEffectiveDate = new Date(companyEffectiveDate);
        // Add random days (0-30) to company effective date
        contactEffectiveDate.setDate(contactEffectiveDate.getDate() + this.getRandomInt(0, 30));
        
        // Generate realistic person data with Faker
        // Resetting the seed for each contact to ensure deterministic results
        faker.seed(this.getSeedNumber(`${this.seed}-${globalContactIndex}`));
        
        const firstname = faker.person.firstName();
        const lastname = faker.person.lastName();
        const jobtitle = this.getJobTitle(roleType);
        
        // Use the global contact index to ensure unique email addresses
        const contactIndex = globalContactIndex++;
        
        const contact: Contact = {
          id,
          properties: {
            email: this.generateEmail(firstname, lastname, company.properties.domain || 'example.com', contactIndex),
            firstname,
            lastname,
            jobtitle,
            phone: faker.phone.number('(###) ###-####'),
            lifecyclestage: this.pickRandom(this.lifecycleStages),
            company: company.properties.name,
            neuco_effective_date: contactEffectiveDate.toISOString()
          },
          associations: {
            companies: [company.id]
          },
          createdAt: contactEffectiveDate.toISOString(),
          updatedAt: contactEffectiveDate.toISOString()
        };
        
        contacts.push(contact);
      }
    });
    
    // Sort contacts by effective date
    contacts.sort((a, b) => 
      new Date(a.properties.neuco_effective_date).getTime() - 
      new Date(b.properties.neuco_effective_date).getTime()
    );
    
    // Save to JSON
    this.saveToJson(contacts, 'base/contacts.json');
    
    // Also save associations to a separate file for easy tracking
    this.saveAssociations(contacts);
    
    return contacts;
  }

  /**
   * Determine role type based on distribution
   */
  private getRoleTypeByDistribution(): string {
    const rand = this.random() * 100;
    const execThreshold = this.distribution.byRole.executive;
    const mgmtThreshold = execThreshold + this.distribution.byRole.management;
    
    if (rand < execThreshold) {
      return 'executive';
    } else if (rand < mgmtThreshold) {
      return 'management';
    } else {
      return 'individual';
    }
  }

  /**
   * Get a job title based on role type
   */
  private getJobTitle(roleType: string): string {
    const titles = this.roleCategories[roleType] || this.roleCategories.individual;
    return faker.helpers.arrayElement(titles);
  }

  /**
   * Generate email based on name and domain
   */
  private generateEmail(firstname: string, lastname: string, domain: string, index: number): string {
    // Normalize to lowercase and remove spaces
    firstname = firstname.toLowerCase().replace(/\s+/g, '');
    lastname = lastname.toLowerCase().replace(/\s+/g, '');
    
    // Create a unique email using the index
    // Choose from different email formats for more variety
    const emailFormats = [
      `${firstname}.${lastname}${index}@${domain}`,
      `${firstname}${index}@${domain}`,
      `${firstname[0]}${lastname}${index}@${domain}`,
      `${lastname}.${firstname}${index}@${domain}`
    ];
    
    const formatIndex = Math.floor(
      faker.number.int({ min: 0, max: 999 }) % emailFormats.length
    );
    
    return emailFormats[formatIndex];
  }

  /**
   * Save associations to a separate file for tracking
   */
  private saveAssociations(contacts: Contact[]): void {
    const associations = contacts.map(contact => ({
      contactId: contact.id,
      companyIds: contact.associations.companies,
      effectiveDate: contact.properties.neuco_effective_date
    }));
    
    this.saveToJson(associations, 'base/contact-company-associations.json');
  }
}