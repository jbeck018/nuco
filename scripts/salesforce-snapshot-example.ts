#!/usr/bin/env ts-node
/**
 * Salesforce Snapshot Example Script
 * 
 * This script demonstrates how to:
 * 1. Authenticate with Salesforce
 * 2. Query Salesforce data (opportunities, contacts, accounts)
 * 3. Store the data in Cloudflare R2 as snapshots
 * 
 * Usage:
 * npm run snapshot -- --org=<organization-id>
 */

import { SalesforceIntegration } from "../src/lib/integrations/salesforce";
import { SalesforceSnapshotService, initializeR2Bucket } from "../src/lib/integrations/salesforce-snapshots";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import { Command } from "commander";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Parse command line arguments
const program = new Command();
program
  .option("--org <organizationId>", "Organization ID to snapshot")
  .option("--batch <size>", "Batch size (default: 500)", "500")
  .option("--include-deleted", "Include deleted records")
  .option("--from-date <date>", "Only include records modified after this date (YYYY-MM-DD)")
  .option("--entity <type>", "Entity type to snapshot (opportunity, contact, account, or all)", "all")
  .parse(process.argv);

const options = program.opts();

async function main() {
  try {
    console.log("Starting Salesforce snapshot process...");
    
    // Validate required parameters
    if (!options.org) {
      console.error("Error: Organization ID is required. Use --org=<organization-id>");
      process.exit(1);
    }
    
    // Initialize S3 client for Cloudflare R2
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT || "https://your-account-id.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
    
    // Initialize bucket
    const bucketName = process.env.R2_BUCKET_NAME || "salesforce-snapshots";
    await initializeR2Bucket(s3Client, bucketName);
    
    // First, check if we're authenticated with Salesforce
    const sfIntegration = new SalesforceIntegration();
    const authStatus = await sfIntegration.getAuthStatus();
    
    if (!authStatus.isAuthenticated) {
      console.log("Not authenticated with Salesforce. Initiating authentication...");
      await sfIntegration.authenticate();
      console.log("Please complete the authentication process in your browser.");
      return;
    }
    
    console.log(`Authenticated with Salesforce as user ID: ${authStatus.accountId}`);
    
    // Create snapshot service
    const snapshotService = new SalesforceSnapshotService();
    
    // Prepare query options
    const queryOptions = {
      organizationId: options.org,
      batchSize: parseInt(options.batch, 10),
      includeDeleted: options.includeDeleted || false,
      fromDate: options.fromDate ? new Date(options.fromDate) : undefined,
    };
    
    // Execute snapshot based on entity type
    const startTime = new Date();
    let results;
    
    switch (options.entity.toLowerCase()) {
      case "opportunity":
        console.log("Querying Salesforce opportunities...");
        results = await snapshotService.queryOpportunities(queryOptions);
        logResults("Opportunities", results);
        break;
        
      case "contact":
        console.log("Querying Salesforce contacts...");
        results = await snapshotService.queryContacts(queryOptions);
        logResults("Contacts", results);
        break;
        
      case "account":
        console.log("Querying Salesforce accounts...");
        results = await snapshotService.queryAccounts(queryOptions);
        logResults("Accounts", results);
        break;
        
      case "all":
      default:
        console.log("Querying all Salesforce entities (opportunities, contacts, accounts)...");
        const allResults = await snapshotService.queryAllEntities(queryOptions);
        
        logResults("Opportunities", allResults.opportunities);
        logResults("Contacts", allResults.contacts);
        logResults("Accounts", allResults.accounts);
        
        // Calculate total records
        const totalRecords = 
          allResults.opportunities.data.records.length +
          allResults.contacts.data.records.length +
          allResults.accounts.data.records.length;
          
        console.log(`Total records processed: ${totalRecords}`);
        break;
    }
    
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log(`Snapshot process completed in ${duration.toFixed(2)} seconds.`);
    console.log(`Data stored in Cloudflare R2 bucket: ${bucketName}`);
    
  } catch (error) {
    console.error("Error executing Salesforce snapshot:", error);
    process.exit(1);
  }
}

function logResults(entityType: string, results: any) {
  console.log(`Retrieved ${results.data.records.length} ${entityType}`);
  console.log(`Snapshot ID: ${results.metadata.snapshotId}`);
  console.log(`Timestamp: ${results.metadata.timestamp.toISOString()}`);
  console.log(`Storage path: ${results.metadata.organizationId}/${results.metadata.entityType}/${results.metadata.timestamp.toISOString().split("T")[0].replace(/-/g, "/")}/${results.metadata.snapshotId}.json`);
}

// Run the main function
main().catch(console.error);
