/**
 * HubSpot Cleanup Script
 * 
 * This script removes all test data from a HubSpot instance.
 * It's useful before running a new seeding process.
 * 
 * Usage:
 *   bun run seeders/hubspot/cleanup-hubspot.ts
 */

import * as dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';
import * as path from 'path';
import { RateLimiter } from './rate-limiter';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
console.log('Loaded .env from:', path.resolve(process.cwd(), '.env'));
console.log('Current working directory:', process.cwd());

async function main() {
  console.log('Starting HubSpot data cleanup...');
  
  // Initialize HubSpot client
  const token = process.env.HUBSPOT_TEST_PAT;
  if (!token) {
    console.error('ERROR: HUBSPOT_TEST_PAT environment variable not found.');
    console.error('Please ensure your .env file contains a valid HubSpot Personal Access Token.');
    process.exit(1);
  }
  
  console.log('Using HubSpot token:', token.substring(0, 10) + '...');
  
  const client = new Client({ 
    accessToken: token 
  });
  
  // Initialize rate limiter
  const rateLimiter = new RateLimiter({
    debugMode: true
  });
  
  // Clean up deals first (due to associations)
  await cleanupDeals();
  
  // Clean up contacts
  await cleanupContacts();
  
  // Clean up companies
  await cleanupCompanies();
  
  console.log('Cleanup complete!');
  
  // Helper function to clean up deals
  async function cleanupDeals() {
    console.log('Cleaning up deals...');
    let deletedCount = 0;
    
    try {
      // Get all deals
      const deals = await getAllRecords('deals');
      console.log(`Found ${deals.length} deals to clean up.`);
      
      // Process each deal
      for (const deal of deals) {
        try {
          await rateLimiter.schedule(() => client.crm.deals.basicApi.archive(deal.id));
          deletedCount++;
          
          if (deletedCount % 5 === 0) {
            console.log(`Deleted ${deletedCount}/${deals.length} deals.`);
          }
        } catch (error) {
          console.error(`Error deleting deal ${deal.id}:`, error);
        }
      }
      
      console.log(`Deleted ${deletedCount} deals.`);
    } catch (error) {
      console.error('Error cleaning up deals:', error);
    }
  }
  
  // Helper function to clean up contacts
  async function cleanupContacts() {
    console.log('Cleaning up contacts...');
    let deletedCount = 0;
    
    try {
      // Get all contacts
      const contacts = await getAllRecords('contacts');
      console.log(`Found ${contacts.length} contacts to clean up.`);
      
      // Process each contact
      for (const contact of contacts) {
        try {
          await rateLimiter.schedule(() => client.crm.contacts.basicApi.archive(contact.id));
          deletedCount++;
          
          if (deletedCount % 5 === 0) {
            console.log(`Deleted ${deletedCount}/${contacts.length} contacts.`);
          }
        } catch (error) {
          console.error(`Error deleting contact ${contact.id}:`, error);
        }
      }
      
      console.log(`Deleted ${deletedCount} contacts.`);
    } catch (error) {
      console.error('Error cleaning up contacts:', error);
    }
  }
  
  // Helper function to clean up companies
  async function cleanupCompanies() {
    console.log('Cleaning up companies...');
    let deletedCount = 0;
    
    try {
      // Get all companies
      const companies = await getAllRecords('companies');
      console.log(`Found ${companies.length} companies to clean up.`);
      
      // Process each company
      for (const company of companies) {
        try {
          await rateLimiter.schedule(() => client.crm.companies.basicApi.archive(company.id));
          deletedCount++;
          
          if (deletedCount % 5 === 0) {
            console.log(`Deleted ${deletedCount}/${companies.length} companies.`);
          }
        } catch (error) {
          console.error(`Error deleting company ${company.id}:`, error);
        }
      }
      
      console.log(`Deleted ${deletedCount} companies.`);
    } catch (error) {
      console.error('Error cleaning up companies:', error);
    }
  }
  
  // Helper function to get all records of a specific type
  async function getAllRecords(objectType: 'contacts' | 'companies' | 'deals') {
    let allRecords: any[] = [];
    let after: string | undefined;
    const limit = 100;  // Maximum allowed by HubSpot API
    
    do {
      let response;
      
      // Get page of records based on object type
      switch (objectType) {
        case 'contacts':
          response = await rateLimiter.schedule(() => 
            client.crm.contacts.basicApi.getPage(limit, after)
          );
          break;
        case 'companies':
          response = await rateLimiter.schedule(() => 
            client.crm.companies.basicApi.getPage(limit, after)
          );
          break;
        case 'deals':
          response = await rateLimiter.schedule(() => 
            client.crm.deals.basicApi.getPage(limit, after)
          );
          break;
      }
      
      // Add results to the list
      allRecords = allRecords.concat(response.results);
      
      // Get pagination token for next page
      after = response.paging?.next?.after;
    } while (after);
    
    return allRecords;
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});