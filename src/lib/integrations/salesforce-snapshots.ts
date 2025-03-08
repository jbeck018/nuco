import { SalesforceIntegration, SalesforceQueryResult } from './salesforce';
import { db } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Interface for snapshot metadata
interface SnapshotMetadata {
  snapshotId: string;
  timestamp: Date;
  entityType: 'opportunity' | 'contact' | 'account';
  recordCount: number;
  organizationId: string;
}

// Interface for snapshot index entry
interface SnapshotIndexEntry {
  snapshotId: string;
  timestamp: string;
  entityType: string;
  recordCount: number;
  organizationId: string;
  path: string;
}

// Interface for snapshot index
interface SnapshotIndex {
  snapshots: SnapshotIndexEntry[];
  lastUpdated: string;
}

// Interface for our bulk query options
interface BulkQueryOptions {
  organizationId: string;
  batchSize?: number;
  includeDeleted?: boolean;
  fromDate?: Date;
}

/**
 * Salesforce Snapshot Service
 * This service is responsible for querying Salesforce data in bulk
 * and storing it efficiently as time series data in Cloudflare R2
 */
export class SalesforceSnapshotService {
  private salesforceIntegration: SalesforceIntegration;
  private s3Client: S3Client;
  private bucketName: string;
  
  /**
   * Constructor for SalesforceSnapshotService
   */
  constructor() {
    this.salesforceIntegration = new SalesforceIntegration();
    
    // Initialize R2 client for efficient time series storage
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || 'https://your-account-id.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      }
    });
    
    this.bucketName = process.env.R2_BUCKET_NAME || 'salesforce-snapshots';
  }
  
  /**
   * Query Salesforce opportunities in bulk
   * @param options - Query options
   * @returns The query results and snapshot metadata
   */
  async queryOpportunities(options: BulkQueryOptions): Promise<{
    data: SalesforceQueryResult;
    metadata: SnapshotMetadata;
  }> {
    const { organizationId, batchSize = 2000, includeDeleted = false, fromDate } = options;
    
    // Build SOQL query for opportunities with all fields
    let query = `
      SELECT FIELDS(ALL),
        (SELECT FIELDS(ALL) FROM OpportunityLineItems),
        (SELECT FIELDS(ALL) FROM OpportunityContactRoles),
        (SELECT FIELDS(ALL) FROM OpportunityHistories),
        (SELECT FIELDS(ALL) FROM Notes),
        (SELECT FIELDS(ALL) FROM AttachedContentDocuments),
        (SELECT FIELDS(ALL) FROM Attachments)
      FROM Opportunity
    `;
    
    // Add date filter if specified
    if (fromDate) {
      const formattedDate = fromDate.toISOString().split('T')[0];
      query += ` WHERE LastModifiedDate >= ${formattedDate}`;
    }
    
    // Add deleted records if requested
    if (includeDeleted) {
      query += includeDeleted ? ' ALL ROWS' : '';
    }
    
    // Add order and limit
    query += ` ORDER BY LastModifiedDate DESC LIMIT ${batchSize}`;
    
    // Execute query
    const data = await this.salesforceIntegration.query(query);
    
    // Create metadata
    const metadata: SnapshotMetadata = {
      snapshotId: uuidv4(),
      timestamp: new Date(),
      entityType: 'opportunity',
      recordCount: data.records.length,
      organizationId
    };
    
    // Store the data in ClickHouse
    await this.storeSnapshot(data.records, metadata);
    
    return { data, metadata };
  }
  
  /**
   * Query Salesforce contacts in bulk
   * @param options - Query options
   * @returns The query results and snapshot metadata
   */
  async queryContacts(options: BulkQueryOptions): Promise<{
    data: SalesforceQueryResult;
    metadata: SnapshotMetadata;
  }> {
    const { organizationId, batchSize = 2000, includeDeleted = false, fromDate } = options;
    
    // Build SOQL query for contacts with all fields
    let query = `
      SELECT FIELDS(ALL),
        (SELECT FIELDS(ALL) FROM Tasks),
        (SELECT FIELDS(ALL) FROM Events),
        (SELECT FIELDS(ALL) FROM Notes),
        (SELECT FIELDS(ALL) FROM AttachedContentDocuments),
        (SELECT FIELDS(ALL) FROM Attachments),
        (SELECT FIELDS(ALL) FROM CampaignMembers)
      FROM Contact
    `;
    
    // Add date filter if specified
    if (fromDate) {
      const formattedDate = fromDate.toISOString().split('T')[0];
      query += ` WHERE LastModifiedDate >= ${formattedDate}`;
    }
    
    // Add deleted records if requested
    if (includeDeleted) {
      query += includeDeleted ? ' ALL ROWS' : '';
    }
    
    // Add order and limit
    query += ` ORDER BY LastModifiedDate DESC LIMIT ${batchSize}`;
    
    // Execute query
    const data = await this.salesforceIntegration.query(query);
    
    // Create metadata
    const metadata: SnapshotMetadata = {
      snapshotId: uuidv4(),
      timestamp: new Date(),
      entityType: 'contact',
      recordCount: data.records.length,
      organizationId
    };
    
    // Store the data in ClickHouse
    await this.storeSnapshot(data.records, metadata);
    
    return { data, metadata };
  }
  
  /**
   * Query Salesforce accounts in bulk
   * @param options - Query options
   * @returns The query results and snapshot metadata
   */
  async queryAccounts(options: BulkQueryOptions): Promise<{
    data: SalesforceQueryResult;
    metadata: SnapshotMetadata;
  }> {
    const { organizationId, batchSize = 2000, includeDeleted = false, fromDate } = options;
    
    // Build SOQL query for accounts with all fields
    let query = `
      SELECT FIELDS(ALL),
        (SELECT FIELDS(ALL) FROM Contacts),
        (SELECT FIELDS(ALL) FROM Opportunities),
        (SELECT FIELDS(ALL) FROM Cases),
        (SELECT FIELDS(ALL) FROM Notes),
        (SELECT FIELDS(ALL) FROM AttachedContentDocuments),
        (SELECT FIELDS(ALL) FROM Attachments),
        (SELECT FIELDS(ALL) FROM AccountHistory)
      FROM Account
    `;
    
    // Add date filter if specified
    if (fromDate) {
      const formattedDate = fromDate.toISOString().split('T')[0];
      query += ` WHERE LastModifiedDate >= ${formattedDate}`;
    }
    
    // Add deleted records if requested
    if (includeDeleted) {
      query += includeDeleted ? ' ALL ROWS' : '';
    }
    
    // Add order and limit
    query += ` ORDER BY LastModifiedDate DESC LIMIT ${batchSize}`;
    
    // Execute query
    const data = await this.salesforceIntegration.query(query);
    
    // Create metadata
    const metadata: SnapshotMetadata = {
      snapshotId: uuidv4(),
      timestamp: new Date(),
      entityType: 'account',
      recordCount: data.records.length,
      organizationId
    };
    
    // Store the data in ClickHouse
    await this.storeSnapshot(data.records, metadata);
    
    return { data, metadata };
  }
  
  /**
   * Query all Salesforce entities (opportunities, contacts, accounts) in bulk
   * @param options - Query options
   * @returns The query results for all entity types
   */
  async queryAllEntities(options: BulkQueryOptions): Promise<{
    opportunities: { data: SalesforceQueryResult; metadata: SnapshotMetadata };
    contacts: { data: SalesforceQueryResult; metadata: SnapshotMetadata };
    accounts: { data: SalesforceQueryResult; metadata: SnapshotMetadata };
  }> {
    // Run all queries in parallel for efficiency
    const [opportunities, contacts, accounts] = await Promise.all([
      this.queryOpportunities(options),
      this.queryContacts(options),
      this.queryAccounts(options)
    ]);
    
    return { opportunities, contacts, accounts };
  }
  
  /**
   * Store snapshot data in Cloudflare R2 for efficient time series storage
   * @param records - The records to store
   * @param metadata - The snapshot metadata
   */
  private async storeSnapshot(
    records: Record<string, unknown>[],
    metadata: SnapshotMetadata
  ): Promise<void> {
    try {
      const timestamp = metadata.timestamp.toISOString();
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(5, 7);
      const day = timestamp.substring(8, 10);
      
      // Create path for the snapshot
      const path = `${metadata.organizationId}/${metadata.entityType}/${year}/${month}/${day}/${metadata.snapshotId}.json`;
      
      // Store the data in R2
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: path,
          Body: JSON.stringify({
            metadata: {
              snapshotId: metadata.snapshotId,
              timestamp,
              entityType: metadata.entityType,
              recordCount: records.length,
              organizationId: metadata.organizationId
            },
            records
          }),
          ContentType: 'application/json'
        })
      );
      
      // Update the snapshot index
      await this.updateSnapshotIndex({
        snapshotId: metadata.snapshotId,
        timestamp,
        entityType: metadata.entityType,
        recordCount: records.length,
        organizationId: metadata.organizationId,
        path
      });
      
      console.log(`Successfully stored ${records.length} ${metadata.entityType} records in snapshot ${metadata.snapshotId}`);
    } catch (error) {
      console.error('Error storing snapshot data:', error);
      throw error;
    }
  }
  
  /**
   * Update the snapshot index with a new entry
   * @param entry - The snapshot index entry
   */
  private async updateSnapshotIndex(entry: SnapshotIndexEntry): Promise<void> {
    try {
      // Get the current index
      const indexPath = `${entry.entityType}_index.json`;
      let index: SnapshotIndex = {
        snapshots: [],
        lastUpdated: new Date().toISOString()
      };
      
      try {
        // Try to get the existing index
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: indexPath
          })
        );
        
        // Parse the index
        const indexData = await streamToString(response.Body);
        if (indexData) {
          index = JSON.parse(indexData);
        }
      } catch (error) {
        // If the index doesn't exist, we'll create a new one
        console.log(`Creating new index for ${entry.entityType}`);
      }
      
      // Add the new entry
      index.snapshots.push(entry);
      index.lastUpdated = new Date().toISOString();
      
      // Store the updated index
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: indexPath,
          Body: JSON.stringify(index),
          ContentType: 'application/json'
        })
      );
    } catch (error) {
      console.error('Error updating snapshot index:', error);
      throw error;
    }
  }
  
  /**
   * Get the last snapshot timestamp for an entity type
   * @param organizationId - The organization ID
   * @param entityType - The entity type
   * @returns The last snapshot timestamp or null if no snapshots exist
   */
  async getLastSnapshotTimestamp(
    organizationId: string,
    entityType: 'opportunity' | 'contact' | 'account'
  ): Promise<Date | null> {
    try {
      // Get the index for this entity type
      const indexPath = `${entityType}_index.json`;
      
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: indexPath
          })
        );
        
        // Parse the index
        const indexData = await streamToString(response.Body);
        if (indexData) {
          const index: SnapshotIndex = JSON.parse(indexData);
          
          // Filter snapshots for this organization and find the most recent one
          const orgSnapshots = index.snapshots
            .filter(snapshot => snapshot.organizationId === organizationId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          if (orgSnapshots.length > 0) {
            return new Date(orgSnapshots[0].timestamp);
          }
        }
      } catch (error) {
        // If the index doesn't exist, return null
        console.log(`No index found for ${entityType}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last snapshot timestamp:', error);
      return null;
    }
  }
  
  /**
   * Schedule regular snapshots for an organization
   * @param organizationId - The organization ID
   * @param intervalHours - The interval in hours between snapshots
   */
  async scheduleSnapshots(organizationId: string, intervalHours = 24): Promise<void> {
    // This is a placeholder for a scheduling mechanism
    // In a real implementation, you would use a job scheduler like node-cron
    
    console.log(`Scheduled Salesforce snapshots for organization ${organizationId} every ${intervalHours} hours`);
    
    // Example implementation with setInterval (not recommended for production)
    setInterval(async () => {
      try {
        // Get last snapshot timestamps
        const lastOpportunitySnapshot = await this.getLastSnapshotTimestamp(organizationId, 'opportunity');
        const lastContactSnapshot = await this.getLastSnapshotTimestamp(organizationId, 'contact');
        const lastAccountSnapshot = await this.getLastSnapshotTimestamp(organizationId, 'account');
        
        // Query all entities with incremental updates
        await this.queryAllEntities({
          organizationId,
          fromDate: lastOpportunitySnapshot || undefined
        });
        
        console.log(`Completed scheduled snapshot for organization ${organizationId}`);
      } catch (error) {
        console.error(`Error in scheduled snapshot for organization ${organizationId}:`, error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}

/**
 * Initialize R2 bucket for Salesforce snapshots
 * This function checks if the bucket exists and creates it if it doesn't
 */
export async function initializeR2Bucket(s3Client: S3Client, bucketName: string): Promise<void> {
  try {
    // Check if bucket exists by listing objects
    await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1
      })
    );
    console.log(`R2 bucket '${bucketName}' already exists`);
  } catch (error) {
    if ((error as any).name === 'NoSuchBucket') {
      console.log(`R2 bucket '${bucketName}' doesn't exist, please create it in the Cloudflare dashboard`);
    } else {
      console.error('Error checking R2 bucket:', error);
      throw error;
    }
  }
}

/**
 * Helper function to convert a readable stream to a string
 */
async function streamToString(stream: any): Promise<string> {
  if (!stream) return '';
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}
