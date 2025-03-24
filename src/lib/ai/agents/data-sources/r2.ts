import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getEnv } from '@/lib/env';
import { AIServiceError } from '../../error';

/**
 * R2 configuration interface
 */
export interface R2Config {
  bucket: string;
  prefix?: string;
  region?: string;
  maxKeys?: number;
  fileTypes?: string[];
  recursive?: boolean;
}

/**
 * R2 data source implementation
 */
export class R2DataSource {
  private client: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = getEnv();

    this.config = {
      region: 'auto',
      recursive: true,
      ...config,
    };

    this.client = new S3Client({
      region: this.config.region,
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * List objects in the bucket
   */
  async listObjects(): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: this.config.prefix,
        MaxKeys: this.config.maxKeys,
      });

      const response = await this.client.send(command);
      const objects = response.Contents || [];

      // Filter by file types if specified
      const filteredObjects = this.config.fileTypes
        ? objects.filter((obj) => {
            const extension = obj.Key?.split('.').pop()?.toLowerCase();
            return extension && this.config.fileTypes?.includes(extension);
          })
        : objects;

      return filteredObjects.map((obj) => obj.Key || '').filter(Boolean);
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to list R2 objects',
        'custom',
        'r2_list_error'
      );
    }
  }

  /**
   * Get object content
   */
  async getObject(key: string): Promise<Record<string, unknown>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      const content = await response.Body?.transformToString();

      if (!content) {
        throw new Error('Empty object content');
      }

      // Try to parse as JSON first
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, return as plain text
        return {
          content,
          type: 'text',
          key,
        };
      }
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to get R2 object',
        'custom',
        'r2_get_error'
      );
    }
  }

  /**
   * Get all objects in the bucket
   */
  async getAllObjects(): Promise<Record<string, unknown>[]> {
    try {
      const keys = await this.listObjects();
      const objects = await Promise.all(
        keys.map((key) => this.getObject(key))
      );
      return objects;
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to get all R2 objects',
        'custom',
        'r2_get_all_error'
      );
    }
  }

  /**
   * Get objects by type
   */
  async getObjectsByType(type: string): Promise<Record<string, unknown>[]> {
    try {
      const keys = await this.listObjects();
      const objects = await Promise.all(
        keys
          .filter((key) => key.endsWith(`.${type}`))
          .map((key) => this.getObject(key))
      );
      return objects;
    } catch (error) {
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to get R2 objects by type',
        'custom',
        'r2_get_by_type_error'
      );
    }
  }
} 