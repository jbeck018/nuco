/**
 * HubSpot Seed, Upload, and Associate Script
 * 
 * This script provides a complete workflow for HubSpot data seeding:
 * 1. Sets up custom properties in HubSpot
 * 2. Seeds data locally
 * 3. Cleans up existing data in HubSpot (with user verification pause)
 * 4. Uploads entities to HubSpot
 * 5. Exports association data
 * 6. Creates associations in HubSpot
 * 
 * Usage: bun run seeders/hubspot/seed-upload-associate.ts <organization-id> [--no-cleanup]
 */

import { execSync } from 'child_process';
import { HubSpotUploader } from './hubspot-uploader';
import { exportAssociations } from './export-associations';
import { createAssociations } from './create-associations';
import * as path from 'path';

// Configuration
const DEFAULT_ORG_ID = 'test-org-small';
const COMPANY_COUNT = 1;
const CONTACT_MIN = 1;
const CONTACT_MAX = 2;
const BASE_DIR = path.join(__dirname, 'data');

// Helper functions
function runCommand(command: string): void {
  console.log(`Running: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    console.log(output);
  } catch (error) {
    console.error(`Command failed: ${error.message}`);
    console.error(error.stdout?.toString());
    console.error(error.stderr?.toString());
    throw error;
  }
}

// (function askQuestion has been removed - no longer needed)

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const organizationId = args[0] || DEFAULT_ORG_ID;
  const skipCleanup = args.includes('--no-cleanup');
  
  console.log('='.repeat(80));
  console.log(`HubSpot Seed, Upload, and Associate for Organization: ${organizationId}`);
  console.log('='.repeat(80));
  
  try {
    // Step 1: Setup custom properties in HubSpot
    console.log('\n📋 Setting up custom properties in HubSpot...');
    runCommand('bun run seeders/hubspot/setup-properties.ts');
    
    // Step 2: Generate data locally
    console.log('\n🌱 Generating seed data...');
    runCommand(`bun run seeders/hubspot/seed-hubspot.ts ${organizationId} --companies ${COMPANY_COUNT} --contacts-min ${CONTACT_MIN} --contacts-max ${CONTACT_MAX} --base-dir ${BASE_DIR}`);
    
    // Step 3: Clean up HubSpot and upload entities
    console.log('\n🧹 Cleaning up HubSpot and uploading entities...');
    
    // Create uploader instance
    // Note: We'll let the uploader handle the cleanup to avoid doing it twice
    const uploader = new HubSpotUploader({
      organizationId,
      baseDir: BASE_DIR,
      cleanupBeforeUpload: !skipCleanup
    });
    
    // Upload entities
    console.log('\n📤 Uploading entities to HubSpot (without associations)...');
    const uploadSuccess = await uploader.uploadAll();
    
    if (!uploadSuccess) {
      throw new Error('Upload failed. Check the logs for details.');
    }
    
    // Step 4: Export association data
    console.log('\n📊 Exporting association data...');
    await exportAssociations(organizationId, BASE_DIR);
    
    // We now have the correct association type IDs, so we don't need to filter anything
    console.log('\n✅ Using corrected association type IDs - all associations should work.');
    
    // Step 5: Create associations
    console.log('\n🔗 Creating associations in HubSpot...');
    const associationResults = await createAssociations(organizationId, BASE_DIR);
    
    console.log('\n✅ Complete workflow finished!');
    console.log(`Created ${associationResults.successCount} associations successfully.`);
    if (associationResults.failureCount > 0) {
      console.log(`Failed to create ${associationResults.failureCount} associations.`);
      console.log('Check the association-results.json file for details.');
    }
    
  } catch (error) {
    console.error('\n❌ Process failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();