/**
 * Company Generator
 * 
 * Generates realistic company data for HubSpot seeding.
 * Uses Faker.js for realistic data and HubSpot-specific property values.
 */

import { BaseGenerator, GeneratorOptions } from './generator-base';
import { HubSpotSchemaLoader } from './hubspot-schema-loader';
import { faker } from '@faker-js/faker';

export interface CompanySize {
  label: string;
  minEmployees: number;
  maxEmployees: number;
  minRevenue: number;
  maxRevenue: number;
}

export interface CompanyGeneratorOptions extends GeneratorOptions {
  count?: number;
  companySizes?: CompanySize[];
}

export interface Company {
  id: string;
  hubspotId?: string;
  properties: {
    name: string;
    domain?: string;
    industry?: string;
    description?: string;
    numberofemployees?: number;
    annualrevenue?: number;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    website?: string;
    neuco_effective_date: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export class CompanyGenerator extends BaseGenerator {
  private count: number;
  private companySizes: CompanySize[];
  private hubspotSchema: HubSpotSchemaLoader;
  
  // HubSpot industry values - must match HubSpot's enum values
  private hubspotIndustries: string[] = [
    'COMPUTER_SOFTWARE',
    'HOSPITAL_HEALTH_CARE',
    'FINANCIAL_SERVICES',
    'INFORMATION_TECHNOLOGY_AND_SERVICES',
    'RETAIL',
    'EDUCATION_MANAGEMENT',
    'MANAGEMENT_CONSULTING',
    'MARKETING_AND_ADVERTISING'
  ];

  constructor(options: CompanyGeneratorOptions) {
    super(options);
    this.count = options.count || 20;
    this.hubspotSchema = new HubSpotSchemaLoader();
    
    this.companySizes = options.companySizes || [
      { 
        label: 'Small',
        minEmployees: 1,
        maxEmployees: 50,
        minRevenue: 100000,
        maxRevenue: 5000000
      },
      { 
        label: 'Medium',
        minEmployees: 51,
        maxEmployees: 200,
        minRevenue: 5000001,
        maxRevenue: 50000000
      },
      { 
        label: 'Large',
        minEmployees: 201,
        maxEmployees: 1000,
        minRevenue: 50000001,
        maxRevenue: 500000000
      },
      { 
        label: 'Enterprise',
        minEmployees: 1001,
        maxEmployees: 10000,
        minRevenue: 500000001,
        maxRevenue: 10000000000
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
   * Generate company data
   */
  public generateCompanies(): Company[] {
    const companies: Company[] = [];
    const startDate = new Date('2024-01-01');
    const endDate = new Date();
    
    for (let i = 0; i < this.count; i++) {
      // Reseed faker for each company to ensure deterministic but diverse results
      faker.seed(this.getSeedNumber(`${this.seed}-company-${i}`));
      
      // Use HubSpot industry values directly
      const industry = this.pickRandom(this.hubspotIndustries);
      const companySize = this.pickRandom(this.companySizes);
      const effectiveDate = this.getRandomDate(startDate, endDate);
      
      // Create deterministic ID based on organization and company index
      const id = this.generateDeterministicId(`company-${i}`);
      
      // Generate a realistic company name
      const companyName = this.generateCompanyName(industry);
      
      // Generate a domain based on the company name
      const domain = this.generateDomain(companyName, i);
      
      const company: Company = {
        id,
        properties: {
          name: companyName,
          domain,
          industry, // Already a HubSpot-specific value
          description: this.generateDescription(industry),
          numberofemployees: this.getRandomInt(companySize.minEmployees, companySize.maxEmployees),
          annualrevenue: this.getRandomInt(companySize.minRevenue, companySize.maxRevenue),
          city: faker.location.city(),
          state: faker.location.state({ abbreviated: true }),
          country: 'United States',
          phone: faker.phone.number('(###) ###-####'),
          website: `https://www.${domain}`,
          neuco_effective_date: effectiveDate.toISOString()
        },
        createdAt: effectiveDate.toISOString(),
        updatedAt: effectiveDate.toISOString()
      };
      
      companies.push(company);
    }
    
    // Sort companies by effective date
    companies.sort((a, b) => 
      new Date(a.properties.neuco_effective_date).getTime() - 
      new Date(b.properties.neuco_effective_date).getTime()
    );
    
    // Save to JSON
    this.saveToJson(companies, 'base/companies.json');
    
    return companies;
  }

  /**
   * Generate a realistic company name based on industry
   */
  private generateCompanyName(industry: string): string {
    // Map HubSpot industry codes to faker company names
    const type = this.getCompanyTypeBySector(industry);
    return faker.company.name({ type });
  }
  
  /**
   * Map HubSpot industry to appropriate company type
   */
  private getCompanyTypeBySector(industry: string): number {
    switch (industry) {
      case 'COMPUTER_SOFTWARE':
      case 'INFORMATION_TECHNOLOGY_AND_SERVICES':
        return faker.number.int({ min: 0, max: 3 }); // Tech companies
      case 'FINANCIAL_SERVICES':
        return faker.number.int({ min: 0, max: 2 }); // Financial service companies
      case 'HOSPITAL_HEALTH_CARE':
        return 1; // Healthcare companies
      case 'RETAIL':
        return 0; // General businesses
      case 'EDUCATION_MANAGEMENT':
        return 3; // Educational institutions
      case 'MANAGEMENT_CONSULTING':
      case 'MARKETING_AND_ADVERTISING':
        return faker.number.int({ min: 0, max: 2 }); // Service companies
      default:
        return 0; // Default company type
    }
  }
  
  /**
   * Generate a realistic domain based on company name
   */
  private generateDomain(companyName: string, index: number): string {
    // Generate a domain-friendly version of the company name
    let domain = companyName.toLowerCase()
      .replace(/[&,.'"-]/g, '') // Remove special characters
      .replace(/\s+/g, ''); // Remove spaces
    
    // Add an index to ensure uniqueness
    domain = `${domain}${index}.com`;
    
    return domain;
  }
  
  /**
   * Generate a company description
   */
  private generateDescription(industry: string): string {
    // Create industry-specific mission statements
    let mission = faker.company.catchPhrase();
    let description = '';
    
    switch (industry) {
      case 'COMPUTER_SOFTWARE':
        description = `A leading provider of software solutions. ${mission} We develop innovative applications that help businesses streamline operations and enhance productivity.`;
        break;
      case 'HOSPITAL_HEALTH_CARE':
        description = `Dedicated to improving patient outcomes through advanced healthcare solutions. ${mission} Our approach combines cutting-edge technology with compassionate care.`;
        break;
      case 'FINANCIAL_SERVICES':
        description = `Providing strategic financial services to help clients achieve their goals. ${mission} We offer personalized financial guidance backed by decades of industry expertise.`;
        break;
      case 'INFORMATION_TECHNOLOGY_AND_SERVICES':
        description = `Delivering cutting-edge IT services and solutions to enterprises. ${mission} Our team of experts helps businesses navigate the ever-changing technology landscape.`;
        break;
      case 'RETAIL':
        description = `Offering premium products and exceptional customer experiences. ${mission} We curate high-quality merchandise that meets the diverse needs of our customer base.`;
        break;
      case 'EDUCATION_MANAGEMENT':
        description = `Empowering individuals through knowledge and skill development. ${mission} Our educational programs are designed to prepare students for success in today's competitive marketplace.`;
        break;
      case 'MANAGEMENT_CONSULTING':
        description = `Delivering expert advice and strategic guidance to organizations. ${mission} Our consultants work closely with clients to solve complex business challenges.`;
        break;
      case 'MARKETING_AND_ADVERTISING':
        description = `Creating compelling content and engaging audiences across platforms. ${mission} We help brands tell their stories and connect with their target markets effectively.`;
        break;
      default:
        description = `A leading provider of industry solutions. ${mission} We are committed to delivering exceptional value to our customers.`;
    }
    
    return description;
  }
}