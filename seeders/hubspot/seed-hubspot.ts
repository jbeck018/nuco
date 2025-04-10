/**
 * HubSpot Seeder
 * 
 * This script generates and uploads test data to HubSpot.
 * It creates companies, contacts, deals, tickets, notes, tasks, and their associations.
 * 
 * Usage:
 *   bun run seeders/hubspot/seed-hubspot.ts <organization-id> [--upload] [--skip-cleanup]
 * 
 * Options:
 *   --upload      Upload generated data to HubSpot
 *   --skip-cleanup Don't clean up existing data before upload
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { HubSpotSeeder } from './index';
import { HubSpotUploader } from './hubspot-uploader';

async function main() {
  // Parse command line arguments
  const organizationId = process.argv[2] || uuidv4();
  const upload = process.argv.includes('--upload');
  const skipCleanup = process.argv.includes('--skip-cleanup');
  
  // Parse company count parameter if provided
  let companyCount = 1; // Minimal default for testing
  const companyCountArg = process.argv.find(arg => arg.startsWith('--company-count='));
  if (companyCountArg) {
    const count = parseInt(companyCountArg.split('=')[1], 10);
    if (!isNaN(count) && count > 0) {
      companyCount = count;
    }
  }
  
  // Create data directory if it doesn't exist
  const baseDir = path.join(__dirname, 'data');
  const orgDir = path.join(baseDir, organizationId);
  
  fs.ensureDirSync(orgDir);
  fs.ensureDirSync(path.join(orgDir, 'base'));
  fs.ensureDirSync(path.join(orgDir, 'changes'));
  fs.ensureDirSync(path.join(orgDir, 'snapshots'));
  
  console.log(`Generating data for organization: ${organizationId}`);
  
  // Create the HubSpot seeder
  const seeder = new HubSpotSeeder({
    organizationId,
    baseDir,
    companyCount
  });
  
  // Generate all data
  await seeder.generateInitialData();
  
  // Read the summary file to get counts
  const summaryPath = path.join(orgDir, 'summary.json');
  const summary = await fs.readJson(summaryPath);
  
  console.log('Data generation complete:');
  console.log(`- Created ${summary.companies} companies`);
  console.log(`- Created ${summary.contacts} contacts`);
  console.log(`- Created ${summary.deals} deals`);
  console.log(`- Created ${summary.tickets} tickets`);
  console.log(`- Created ${summary.notes} notes`);
  console.log(`- Created ${summary.tasks} tasks`);
  
  // Save manifest file with generation metadata
  const manifest = {
    organizationId,
    generatedAt: new Date().toISOString(),
    counts: {
      companies: summary.companies,
      contacts: summary.contacts,
      deals: summary.deals,
      tickets: summary.tickets,
      notes: summary.notes,
      tasks: summary.tasks
    }
  };
  
  await fs.writeJson(path.join(orgDir, 'manifest.json'), manifest, { spaces: 2 });
  console.log(`Saved manifest to ${path.join(orgDir, 'manifest.json')}`);
  
  // Upload data to HubSpot if requested
  if (upload) {
    console.log('\nUploading data to HubSpot...');
    
    const uploader = new HubSpotUploader({
      organizationId,
      baseDir,
      cleanupBeforeUpload: !skipCleanup
    });
    
    const success = await uploader.uploadAll();
    
    if (success) {
      console.log('HubSpot upload completed successfully.');
    } else {
      console.error('HubSpot upload failed.');
      process.exit(1);
    }
  } else {
    console.log('\nData generated successfully. To upload to HubSpot, run:');
    console.log(`bun run seeders/hubspot/seed-hubspot.ts ${organizationId} --upload`);
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});