#!/usr/bin/env bun
/**
 * HubSpot Seeder Runner
 * 
 * This script serves as the main entry point for HubSpot data seeding.
 * It provides an interactive CLI to guide users through the seeding process.
 */

import { prompt } from 'prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const DATA_DIR = path.join(__dirname, 'data');

async function main() {
  console.log(chalk.bold.blue('Welcome to the HubSpot Seeder'));
  console.log(chalk.gray('This tool will help you generate and upload test data to HubSpot\n'));
  
  // Check environment variables
  const hasToken = process.env.HUBSPOT_TEST_PAT;
  if (!hasToken) {
    console.log(chalk.yellow('Warning: HUBSPOT_TEST_PAT environment variable not found.'));
    console.log(chalk.yellow('You will not be able to upload data to HubSpot without this token.'));
    console.log(chalk.gray('Create a .env file with your HubSpot Personal Access Token:\n'));
    console.log(chalk.gray('HUBSPOT_TEST_PAT=your_token_here\n'));
  }
  
  // Get operation mode
  const { mode } = await prompt({
    type: 'select',
    name: 'mode',
    message: 'What would you like to do?',
    choices: [
      { title: 'Generate new data locally', value: 'generate' },
      { title: 'List existing generated data sets', value: 'list' },
      { title: 'Upload existing data to HubSpot', value: 'upload' },
      { title: 'Generate and upload data to HubSpot', value: 'generate-upload' }
    ]
  });
  
  // Handle each mode
  switch (mode) {
    case 'generate':
      await generateData();
      break;
    case 'list':
      await listDatasets();
      break;
    case 'upload':
      await uploadExistingData();
      break;
    case 'generate-upload':
      await generateAndUpload();
      break;
    default:
      console.log(chalk.red('Invalid operation selected'));
      process.exit(1);
  }
}

async function generateData() {
  console.log(chalk.bold.green('\nGenerating New Data'));
  
  // Get or generate organization ID
  const { orgIdOption } = await prompt({
    type: 'select',
    name: 'orgIdOption',
    message: 'How would you like to identify this data set?',
    choices: [
      { title: 'Generate a new random UUID', value: 'new' },
      { title: 'Enter a specific identifier (for repeatability)', value: 'specific' }
    ]
  });
  
  let organizationId = '';
  if (orgIdOption === 'new') {
    organizationId = uuidv4();
    console.log(chalk.green(`Generated Organization ID: ${organizationId}`));
  } else {
    const { id } = await prompt({
      type: 'text',
      name: 'id',
      message: 'Enter organization identifier:',
      validate: value => value.trim() !== '' ? true : 'Please enter a valid identifier'
    });
    organizationId = id;
  }
  
  // Configuration options
  const { companyCount } = await prompt({
    type: 'number',
    name: 'companyCount',
    message: 'How many companies would you like to generate?',
    initial: 15,
    min: 1,
    max: 100
  });
  
  
  console.log(chalk.gray('\nStarting data generation...'));
  
  try {
    const command = `bun run seeders/hubspot/seed-hubspot.ts ${organizationId} --company-count=${companyCount}`;
    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(chalk.yellow(stderr));
    
    console.log(chalk.bold.green('\nData generation complete!'));
    console.log(chalk.gray(`Data stored in: ${path.join(DATA_DIR, organizationId)}`));
    console.log(chalk.gray(`To upload this data to HubSpot later, use:`));
    console.log(chalk.gray(`bun run seeders/hubspot/seed-hubspot.ts ${organizationId} --upload`));
  } catch (error) {
    console.error(chalk.red('Error generating data:'), error.message);
    process.exit(1);
  }
}

async function listDatasets() {
  console.log(chalk.bold.green('\nExisting Data Sets'));
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.log(chalk.yellow('No data sets found. Generate data first.'));
    return;
  }
  
  // Get all subdirectories in data directory
  const dirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  if (dirs.length === 0) {
    console.log(chalk.yellow('No data sets found. Generate data first.'));
    return;
  }
  
  console.log(chalk.gray('The following data sets are available:\n'));
  
  // Display each dataset with metadata
  for (const dir of dirs) {
    const manifestPath = path.join(DATA_DIR, dir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = fs.readJsonSync(manifestPath);
      console.log(chalk.bold.blue(`Organization ID: ${dir}`));
      console.log(chalk.gray(`  Generated: ${new Date(manifest.generatedAt).toLocaleString()}`));
      console.log(chalk.gray(`  Companies: ${manifest.counts.companies}`));
      console.log(chalk.gray(`  Contacts: ${manifest.counts.contacts}`));
      console.log(chalk.gray(`  Deals: ${manifest.counts.deals}`));
      
      // Check if uploaded
      const mappingsPath = path.join(DATA_DIR, dir, 'hubspot-id-mappings.json');
      if (fs.existsSync(mappingsPath)) {
        const mappings = fs.readJsonSync(mappingsPath);
        console.log(chalk.green(`  Uploaded: ${new Date(mappings.uploadedAt).toLocaleString()}`));
      } else {
        console.log(chalk.yellow(`  Status: Not uploaded to HubSpot`));
      }
      console.log();
    } else {
      console.log(chalk.yellow(`Organization ID: ${dir} (No manifest found)`));
    }
  }
}

async function uploadExistingData() {
  console.log(chalk.bold.green('\nUpload Existing Data to HubSpot'));
  
  // Check for token
  if (!process.env.HUBSPOT_TEST_PAT) {
    console.log(chalk.red('Error: HUBSPOT_TEST_PAT environment variable not found.'));
    console.log(chalk.gray('Create a .env file with your HubSpot Personal Access Token.'));
    return;
  }
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    console.log(chalk.yellow('No data sets found. Generate data first.'));
    return;
  }
  
  // Get all subdirectories in data directory
  const dirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  if (dirs.length === 0) {
    console.log(chalk.yellow('No data sets found. Generate data first.'));
    return;
  }
  
  // Prompt user to select a dataset
  const { organizationId } = await prompt({
    type: 'select',
    name: 'organizationId',
    message: 'Select a data set to upload:',
    choices: dirs.map(dir => {
      const manifestPath = path.join(DATA_DIR, dir, 'manifest.json');
      let description = '';
      if (fs.existsSync(manifestPath)) {
        const manifest = fs.readJsonSync(manifestPath);
        description = `(${manifest.counts.companies} companies, ${manifest.counts.contacts} contacts, ${manifest.counts.deals} deals)`;
      }
      return { title: `${dir} ${description}`, value: dir };
    })
  });
  
  // Ask about cleanup
  const { skipCleanup } = await prompt({
    type: 'confirm',
    name: 'skipCleanup',
    message: 'Would you like to skip cleanup of existing HubSpot data?',
    initial: false
  });
  
  console.log(chalk.gray('\nStarting upload to HubSpot...'));
  
  try {
    const command = `bun run seeders/hubspot/seed-hubspot.ts ${organizationId} --upload ${skipCleanup ? '--skip-cleanup' : ''}`;
    const { stdout, stderr } = await execAsync(command);
    console.log(stdout);
    if (stderr) console.error(chalk.yellow(stderr));
    
    console.log(chalk.bold.green('\nUpload complete!'));
  } catch (error) {
    console.error(chalk.red('Error uploading data:'), error.message);
    process.exit(1);
  }
}

async function generateAndUpload() {
  // First generate
  await generateData();
  
  // Check if user wants to upload
  const { shouldUpload } = await prompt({
    type: 'confirm',
    name: 'shouldUpload',
    message: 'Would you like to upload this data to HubSpot now?',
    initial: true
  });
  
  if (shouldUpload) {
    await uploadExistingData();
  }
}

// Run the main function
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});