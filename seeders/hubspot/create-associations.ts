/**
 * HubSpot Association Creator
 * 
 * This script creates associations between HubSpot entities using an exported
 * associations file. It tries to create each association and tracks which ones
 * succeed and which ones fail.
 */

import * as dotenv from 'dotenv';
import { Client } from '@hubspot/api-client';
import * as fs from 'fs-extra';
import * as path from 'path';
import { RateLimiter } from './rate-limiter';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
console.log('Loaded .env from:', path.resolve(process.cwd(), '.env'));

interface Association {
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  associationTypeId: number;
  description: string;
}

interface AssociationResult extends Association {
  success: boolean;
  error?: string;
  errorDetails?: any;
}

async function createAssociations(organizationId: string, baseDir: string = './seeders/hubspot/data') {
  console.log(`Creating associations for organization: ${organizationId}`);
  
  // Paths
  const orgDir = path.join(baseDir, organizationId);
  const associationsPath = path.join(orgDir, 'associations.json');
  const resultsPath = path.join(orgDir, 'association-results.json');
  
  // Check if associations file exists
  if (!fs.existsSync(associationsPath)) {
    throw new Error(`Associations file not found at ${associationsPath}. Please run export-associations.ts first.`);
  }
  
  // Load the associations
  const associationsData = await fs.readJson(associationsPath);
  const associations: Association[] = associationsData.associations;
  
  console.log(`Loaded ${associations.length} associations to create.`);
  
  // Initialize HubSpot client
  const token = process.env.HUBSPOT_TEST_PAT;
  if (!token) {
    console.error('ERROR: HUBSPOT_TEST_PAT environment variable not found.');
    process.exit(1);
  }
  
  const client = new Client({ 
    accessToken: token 
  });
  
  // Initialize rate limiter
  const rateLimiter = new RateLimiter({
    debugMode: true
  });
  
  // Track results
  const results: AssociationResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  // Batch size for processing
  const batchSize = 5;
  
  // Process associations in batches
  for (let i = 0; i < associations.length; i += batchSize) {
    const batch = associations.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(associations.length / batchSize)}...`);
    
    const batchResults = await Promise.all(batch.map(async (assoc) => {
      try {
        console.log(`Attempting to create association: ${assoc.description}`);
        console.log(`  From ${assoc.fromType}/${assoc.fromId} to ${assoc.toType}/${assoc.toId}`);
        
        await rateLimiter.schedule(() => 
          client.crm.associations.v4.basicApi.create(
            assoc.fromType,
            assoc.fromId,
            assoc.toType,
            assoc.toId,
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: assoc.associationTypeId }]
          )
        , { requestTimeoutMs: 10000 }); // 10-second timeout
        
        console.log(`✅ SUCCESS: Created association: ${assoc.description}`);
        successCount++;
        
        return {
          ...assoc,
          success: true
        };
      } catch (error) {
        // Check if this is a duplicate association error (can be ignored)
        const isDuplicateError = error.message?.includes('ASSOCIATION_EXISTS') || 
                                 error.response?.body?.message?.includes('already exist');
        
        if (isDuplicateError) {
          console.log(`⚠️ DUPLICATE: Association already exists: ${assoc.description}`);
          successCount++; // Count as success since it exists
          
          return {
            ...assoc,
            success: true,
            error: 'Association already exists'
          };
        } else {
          console.error(`❌ ERROR: Failed to create association: ${assoc.description}`);
          console.error(`   Error: ${error.message}`);
          
          if (error.response?.body) {
            console.error(`   Details: ${JSON.stringify(error.response.body)}`);
          }
          
          failureCount++;
          
          return {
            ...assoc,
            success: false,
            error: error.message,
            errorDetails: error.response?.body
          };
        }
      }
    }));
    
    // Add batch results to overall results
    results.push(...batchResults);
    
    // Add a delay between batches to avoid rate limiting
    if (i + batchSize < associations.length) {
      console.log('Pausing for 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Write intermediate results every 5 batches
    if ((i / batchSize + 1) % 5 === 0 || i + batchSize >= associations.length) {
      await fs.writeJson(resultsPath, {
        metadata: {
          organizationId,
          startedAt: new Date().toISOString(),
          progress: {
            processed: results.length,
            total: associations.length,
            successful: successCount,
            failed: failureCount
          }
        },
        results
      }, { spaces: 2 });
      
      console.log(`Saved intermediate results to ${resultsPath}`);
    }
  }
  
  // Write final results
  await fs.writeJson(resultsPath, {
    metadata: {
      organizationId,
      completedAt: new Date().toISOString(),
      summary: {
        total: associations.length,
        successful: successCount,
        failed: failureCount,
        successRate: `${(successCount / associations.length * 100).toFixed(2)}%`
      }
    },
    results: {
      // Group results by association type
      byType: {
        contactCompany: {
          fromContactToCompany: results.filter(r => r.fromType === 'contacts' && r.toType === 'companies'),
          fromCompanyToContact: results.filter(r => r.fromType === 'companies' && r.toType === 'contacts')
        },
        dealAssociations: {
          fromDealToCompany: results.filter(r => r.fromType === 'deals' && r.toType === 'companies'),
          fromCompanyToDeal: results.filter(r => r.fromType === 'companies' && r.toType === 'deals'),
          fromDealToContact: results.filter(r => r.fromType === 'deals' && r.toType === 'contacts'),
          fromContactToDeal: results.filter(r => r.fromType === 'contacts' && r.toType === 'deals')
        },
        ticketAssociations: {
          fromTicketToCompany: results.filter(r => r.fromType === 'tickets' && r.toType === 'companies'),
          fromCompanyToTicket: results.filter(r => r.fromType === 'companies' && r.toType === 'tickets'),
          fromTicketToContact: results.filter(r => r.fromType === 'tickets' && r.toType === 'contacts'),
          fromContactToTicket: results.filter(r => r.fromType === 'contacts' && r.toType === 'tickets')
        },
        noteAssociations: {
          fromNoteTo: results.filter(r => r.fromType === 'notes'),
          toNoteFrom: results.filter(r => r.toType === 'notes')
        },
        taskAssociations: {
          fromTaskTo: results.filter(r => r.fromType === 'tasks'),
          toTaskFrom: results.filter(r => r.toType === 'tasks')
        }
      },
      // Include all results for reference
      all: results
    }
  }, { spaces: 2 });
  
  console.log('\nAssociation Creation Summary:');
  console.log(`Total associations attempted: ${associations.length}`);
  console.log(`Successful: ${successCount} (${(successCount / associations.length * 100).toFixed(2)}%)`);
  console.log(`Failed: ${failureCount} (${(failureCount / associations.length * 100).toFixed(2)}%)`);
  console.log(`Results saved to: ${resultsPath}`);
  
  // Analyze which types of associations failed
  const failedResults = results.filter(r => !r.success);
  
  if (failedResults.length > 0) {
    console.log('\nAnalysis of Failed Associations:');
    
    // Group by from/to type
    const failuresByType = new Map();
    failedResults.forEach(result => {
      const key = `${result.fromType} → ${result.toType}`;
      if (!failuresByType.has(key)) {
        failuresByType.set(key, {
          count: 0,
          examples: []
        });
      }
      
      const typeData = failuresByType.get(key);
      typeData.count++;
      if (typeData.examples.length < 3) {
        typeData.examples.push({
          fromId: result.fromId,
          toId: result.toId,
          error: result.error
        });
      }
    });
    
    // Display failure statistics
    console.log('Failures by association type:');
    for (const [type, data] of failuresByType.entries()) {
      console.log(`  ${type}: ${data.count} failures`);
      console.log('  Examples:');
      data.examples.forEach(example => {
        console.log(`    - From ID: ${example.fromId}, To ID: ${example.toId}`);
        console.log(`      Error: ${example.error}`);
      });
      console.log('');
    }
  }
  
  return { successCount, failureCount, total: associations.length };
}

// Execute the script if run directly
if (require.main === module) {
  const organizationId = process.argv[2];
  
  if (!organizationId) {
    console.error('Error: Organization ID is required.');
    console.error('Usage: bun run seeders/hubspot/create-associations.ts <organization-id>');
    process.exit(1);
  }
  
  createAssociations(organizationId)
    .catch(err => {
      console.error('Error creating associations:', err);
      process.exit(1);
    });
}

export { createAssociations };