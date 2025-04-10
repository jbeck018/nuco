/**
 * HubSpot Schema Loader
 * 
 * This class loads and provides access to HubSpot schema information,
 * allowing generators to use valid HubSpot property values.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

export class HubSpotSchemaLoader {
  private companyOptions: any;
  private contactOptions: any;
  private dealOptions: any;
  private dealPipelines: any[];
  
  constructor() {
    this.loadSchema();
  }
  
  /**
   * Load schema files
   */
  private loadSchema() {
    const schemaDir = path.join(__dirname, 'hubspot-schema');
    
    try {
      // Ensure the schema directory exists
      fs.ensureDirSync(schemaDir);
      
      // Try to load property options
      try {
        this.companyOptions = fs.readJsonSync(path.join(schemaDir, 'companies-property-options.json'));
      } catch (e) {
        console.warn('Company options not found, using defaults');
        this.companyOptions = {};
      }
      
      try {
        this.contactOptions = fs.readJsonSync(path.join(schemaDir, 'contacts-property-options.json'));
      } catch (e) {
        console.warn('Contact options not found, using defaults');
        this.contactOptions = {};
      }
      
      try {
        this.dealOptions = fs.readJsonSync(path.join(schemaDir, 'deals-property-options.json'));
      } catch (e) {
        console.warn('Deal options not found, using defaults');
        this.dealOptions = {};
      }
      
      try {
        this.dealPipelines = fs.readJsonSync(path.join(schemaDir, 'deals-pipelines.json'));
      } catch (e) {
        console.warn('Deal pipelines not found, using defaults');
        this.dealPipelines = [];
      }
    } catch (error) {
      console.error('Error loading HubSpot schema:', error);
      
      // Initialize with empty objects if files don't exist
      this.companyOptions = {};
      this.contactOptions = {};
      this.dealOptions = {};
      this.dealPipelines = [];
      
      console.warn(
        'HubSpot schema files not found. Run "bun run seeders/hubspot/fetch-property-options.ts" first to fetch valid HubSpot property options.\n' +
        'You can continue with default values, but property validation may fail during upload.'
      );
    }
  }
  
  /**
   * Get a random valid value for a company property
   */
  public getRandomCompanyPropertyValue(propertyName: string): string | null {
    const property = this.companyOptions[propertyName];
    if (!property || !property.options || property.options.length === 0) {
      return null;
    }
    
    // Filter to visible options
    const validOptions = property.options.filter(opt => !opt.hidden);
    if (validOptions.length === 0) return null;
    
    // Return a random option value
    const randomIndex = Math.floor(Math.random() * validOptions.length);
    return validOptions[randomIndex].value;
  }
  
  /**
   * Get a random valid value for a contact property
   */
  public getRandomContactPropertyValue(propertyName: string): string | null {
    const property = this.contactOptions[propertyName];
    if (!property || !property.options || property.options.length === 0) {
      return null;
    }
    
    // Filter to visible options
    const validOptions = property.options.filter(opt => !opt.hidden);
    if (validOptions.length === 0) return null;
    
    // Return a random option value
    const randomIndex = Math.floor(Math.random() * validOptions.length);
    return validOptions[randomIndex].value;
  }
  
  /**
   * Get a random valid value for a deal property
   */
  public getRandomDealPropertyValue(propertyName: string): string | null {
    const property = this.dealOptions[propertyName];
    if (!property || !property.options || property.options.length === 0) {
      return null;
    }
    
    // Filter to visible options
    const validOptions = property.options.filter(opt => !opt.hidden);
    if (validOptions.length === 0) return null;
    
    // Return a random option value
    const randomIndex = Math.floor(Math.random() * validOptions.length);
    return validOptions[randomIndex].value;
  }
  
  /**
   * Get all valid options for a property
   */
  public getPropertyOptions(objectType: 'companies' | 'contacts' | 'deals', propertyName: string): any[] {
    let options;
    
    switch (objectType) {
      case 'companies':
        options = this.companyOptions[propertyName]?.options || [];
        break;
      case 'contacts':
        options = this.contactOptions[propertyName]?.options || [];
        break;
      case 'deals':
        options = this.dealOptions[propertyName]?.options || [];
        break;
      default:
        options = [];
    }
    
    return options.filter(opt => !opt.hidden);
  }
  
  /**
   * Get industry value for a given generic industry
   * Useful for mapping our generic industries to valid HubSpot industries
   */
  public getIndustryValue(genericIndustry: string): string {
    // Industry mapping
    const industryMap = {
      "Technology": "COMPUTER_SOFTWARE",
      "Healthcare": "HOSPITAL_HEALTH_CARE",
      "Finance": "FINANCIAL_SERVICES",
      "Manufacturing": "MANUFACTURING",
      "Retail": "RETAIL",
      "Education": "EDUCATION_MANAGEMENT",
      "Consulting": "MANAGEMENT_CONSULTING",
      "Media": "MEDIA_PRODUCTION"
    };
    
    return industryMap[genericIndustry] || "COMPUTER_SOFTWARE";
  }
  
  /**
   * Get deal stage ID for a pipeline
   */
  public getDealStage(stageName: string): string {
    // Deal stage mapping
    const stageMap = {
      "Qualification": "appointmentscheduled",
      "Meeting Scheduled": "qualifiedtobuy",
      "Proposal": "presentationscheduled",
      "Negotiation": "decisionmakerboughtin",
      "Closed Won": "closedwon",
      "Closed Lost": "closedlost"
    };
    
    return stageMap[stageName] || "appointmentscheduled";
  }
  
  /**
   * Get all deal stages for the default pipeline
   */
  public getDealStages(): any[] {
    const defaultPipeline = this.dealPipelines.find(p => p.id === 'default');
    return defaultPipeline?.stages || [];
  }
  
  /**
   * Get all pipelines
   */
  public getDealPipelines(): any[] {
    return this.dealPipelines;
  }
}