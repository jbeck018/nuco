/**
 * HubSpot Seeder
 * 
 * Main entry point for the HubSpot data seeding tool.
 * This file orchestrates the generation of test data for HubSpot.
 */

import { CompanyGenerator } from './company-generator';
import { ContactGenerator } from './contact-generator';
import { DealGenerator } from './deal-generator';
import { TicketGenerator } from './ticket-generator';
import { NoteGenerator } from './note-generator';
import { TaskGenerator } from './task-generator';
import { ChangeGenerator } from './change-generator';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface SeederOptions {
  organizationId: string;
  baseDir?: string;
  seed?: string;
  companyCount?: number;
  timeIntervals?: number;
  startDate?: Date;
  endDate?: Date;
}

export class HubSpotSeeder {
  private options: SeederOptions;
  
  constructor(options: SeederOptions) {
    this.options = {
      baseDir: path.join(__dirname, 'data'),
      seed: options.organizationId,
      companyCount: 20,
      timeIntervals: 5,
      startDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
      endDate: new Date(),
      ...options
    };
    
    // Ensure base directory exists
    fs.ensureDirSync(this.options.baseDir);
  }
  
  /**
   * Generate initial data for the organization
   */
  public async generateInitialData(): Promise<void> {
    console.log(`Generating initial data for organization: ${this.options.organizationId}`);
    
    // Create configuration file to track settings
    this.saveConfig();
    
    // Generate companies
    console.log('Generating companies...');
    const companyGenerator = new CompanyGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      count: this.options.companyCount
    });
    const companies = companyGenerator.generateCompanies();
    console.log(`Generated ${companies.length} companies`);
    
    // Generate contacts
    console.log('Generating contacts...');
    const contactGenerator = new ContactGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      companies
    });
    const contacts = contactGenerator.generateContacts();
    console.log(`Generated ${contacts.length} contacts`);
    
    // Generate deals
    console.log('Generating deals...');
    const dealGenerator = new DealGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      companies,
      contacts
    });
    const deals = dealGenerator.generateDeals();
    console.log(`Generated ${deals.length} deals`);
    
    // Generate tickets
    console.log('Generating tickets...');
    const ticketGenerator = new TicketGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      companies,
      contacts
    });
    const tickets = ticketGenerator.generateTickets();
    console.log(`Generated ${tickets.length} tickets`);
    
    // Generate notes
    console.log('Generating notes...');
    const noteGenerator = new NoteGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      companies,
      contacts,
      deals,
      tickets
    });
    const notes = noteGenerator.generateNotes();
    console.log(`Generated ${notes.length} notes`);
    
    // Generate tasks
    console.log('Generating tasks...');
    const taskGenerator = new TaskGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      companies,
      contacts,
      deals,
      tickets
    });
    const tasks = taskGenerator.generateTasks();
    console.log(`Generated ${tasks.length} tasks`);
    
    // Save summary
    this.saveSummary({
      companies: companies.length,
      contacts: contacts.length,
      deals: deals.length,
      tickets: tickets.length || 0,
      notes: notes.length || 0,
      tasks: tasks.length || 0,
      generatedAt: new Date().toISOString()
    });
    
    console.log('Initial data generation complete!');
  }
  
  /**
   * Generate time-based changes
   */
  public async generateChanges(): Promise<void> {
    console.log(`Generating changes for organization: ${this.options.organizationId}`);
    
    // Generate changes
    const changeGenerator = new ChangeGenerator({
      organizationId: this.options.organizationId,
      baseDir: this.options.baseDir,
      seed: this.options.seed,
      startDate: this.options.startDate,
      endDate: this.options.endDate,
      intervals: this.options.timeIntervals
    });
    
    const changes = changeGenerator.generateChanges();
    console.log(`Generated ${changes.length} changes across ${this.options.timeIntervals} time intervals`);
    
    // Update summary
    const summaryPath = path.join(this.options.baseDir, this.options.organizationId, 'summary.json');
    if (fs.existsSync(summaryPath)) {
      const summary = fs.readJsonSync(summaryPath);
      summary.changes = changes.length;
      summary.changesGeneratedAt = new Date().toISOString();
      fs.writeJsonSync(summaryPath, summary, { spaces: 2 });
    }
    
    console.log('Change generation complete!');
  }
  
  /**
   * Generate a snapshot of the data at a specific point in time
   */
  public async generateSnapshot(date: Date): Promise<void> {
    console.log(`Generating snapshot for ${date.toISOString()} for organization: ${this.options.organizationId}`);
    
    // To be implemented:
    // This would load the base data and apply all changes up to the given date
    // to create a snapshot of the data at that point in time
    
    console.log('Snapshot generation not yet implemented');
  }
  
  /**
   * Save configuration
   */
  private saveConfig(): void {
    const config = {
      organizationId: this.options.organizationId,
      seed: this.options.seed,
      companyCount: this.options.companyCount,
      timeIntervals: this.options.timeIntervals,
      startDate: this.options.startDate?.toISOString(),
      endDate: this.options.endDate?.toISOString(),
      createdAt: new Date().toISOString()
    };
    
    const orgDir = path.join(this.options.baseDir, this.options.organizationId);
    fs.ensureDirSync(orgDir); // Ensure organization directory exists
    
    const configPath = path.join(orgDir, 'config.json');
    fs.writeJsonSync(configPath, config, { spaces: 2 });
  }
  
  /**
   * Save summary
   */
  private saveSummary(summary: any): void {
    const orgDir = path.join(this.options.baseDir, this.options.organizationId);
    fs.ensureDirSync(orgDir); // Ensure organization directory exists
    
    const summaryPath = path.join(orgDir, 'summary.json');
    fs.writeJsonSync(summaryPath, summary, { spaces: 2 });
  }
}

// Example usage
if (require.main === module) {
  const run = async () => {
    const seeder = new HubSpotSeeder({
      organizationId: process.env.ORG_ID || '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    });
    
    // Generate initial data
    await seeder.generateInitialData();
    
    // Generate changes
    await seeder.generateChanges();
  };
  
  run().catch(console.error);
}