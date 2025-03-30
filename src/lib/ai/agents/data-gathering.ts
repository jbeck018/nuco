import { BaseAgent, AgentConfig, AgentContext, AgentResult } from './base';
import { R2DataSource, R2Config } from './data-sources/r2';
import { PostgresDataSource, PostgresConfig } from './data-sources/postgres';
import { ApiDataSource, ApiConfig } from './data-sources/api';
import { ValidationManager, ValidationConfig } from './validation/manager';
import { AIServiceError } from '../error';
import { db } from '@/lib/db';
import { agentExecutions } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { AIService } from '../service';

export interface DataGatheringConfig extends Omit<AgentConfig, 'aiService'> {
  r2Sources?: R2Config[];
  postgresSources?: PostgresConfig[];
  apiSources?: ApiConfig[];
  validation?: ValidationConfig;
  aiService: AIService;
}

export class DataGatheringAgent extends BaseAgent {
  private r2Clients: Map<string, R2DataSource>;
  private postgresClients: Map<string, PostgresDataSource>;
  private apiClients: Map<string, ApiDataSource>;
  private validationManager?: ValidationManager;

  constructor() {
    const config: AgentConfig = {
      id: 'data-gathering',
      name: 'Data Gathering Agent',
      description: 'Agent for gathering and processing data',
      model: 'gpt-4',
      aiService: new AIService(), // Will be overridden in initialize
    };
    super(config);
    this.r2Clients = new Map();
    this.postgresClients = new Map();
    this.apiClients = new Map();
  }

  async initialize(config: DataGatheringConfig): Promise<void> {
    await super.initialize(config);

    // Initialize R2 clients
    if (config.r2Sources) {
      for (const source of config.r2Sources) {
        this.r2Clients.set(source.bucket, new R2DataSource(source));
      }
    }

    // Initialize Postgres clients
    if (config.postgresSources) {
      for (const source of config.postgresSources) {
        this.postgresClients.set(source.table, new PostgresDataSource(source));
      }
    }

    // Initialize API clients
    if (config.apiSources) {
      for (const source of config.apiSources) {
        this.apiClients.set(source.url, new ApiDataSource(source));
      }
    }

    // Initialize validation manager if configured
    if (config.validation) {
      this.validationManager = new ValidationManager(config.validation);
    }
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    let executionId: string | undefined;

    try {
      // Create execution record
      executionId = crypto.randomUUID();
      await db.insert(agentExecutions).values({
        id: executionId,
        agentId: this.state.id,
        status: 'running',
        input: context.metadata,
        metadata: {
          startTime: new Date().toISOString(),
        },
        startedAt: new Date(),
      });

      const results: Record<string, unknown> = {};
      const validationResults: Record<string, unknown> = {};

      // Process R2 sources
      for (const [bucket, client] of this.r2Clients) {
        const data = await this.processR2Source(client);
        if (this.validationManager) {
          validationResults[`r2_${bucket}`] = this.validationManager.validate(data);
        }
        results[`r2_${bucket}`] = data;
      }

      // Process Postgres sources
      for (const [table, client] of this.postgresClients) {
        const data = await this.processPostgresSource(client);
        if (this.validationManager) {
          validationResults[`postgres_${table}`] = this.validationManager.validate(data);
        }
        results[`postgres_${table}`] = data;
      }

      // Process API sources
      for (const [url, client] of this.apiClients) {
        const data = await this.processApiSource(client);
        if (this.validationManager) {
          validationResults[`api_${url}`] = this.validationManager.validate(data);
        }
        results[`api_${url}`] = data;
      }

      // Add validation results if available
      if (Object.keys(validationResults).length > 0) {
        results.validation = validationResults;
      }

      // Update execution record
      await db
        .update(agentExecutions)
        .set({
          status: 'completed',
          output: results,
          completedAt: new Date(),
        })
        .where(eq(agentExecutions.id, executionId));

      return {
        success: true,
        output: results,
        metadata: {
          executionId,
        },
      };
    } catch (error) {
      // Update execution record with error
      if (executionId) {
        await db
          .update(agentExecutions)
          .set({
            status: 'failed',
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined,
            },
            completedAt: new Date(),
          })
          .where(eq(agentExecutions.id, executionId));
      }

      throw new AIServiceError(
        error instanceof Error ? error.message : 'Failed to execute data gathering',
        'custom',
        'data_gathering_error'
      );
    }
  }

  private async processR2Source(client: R2DataSource): Promise<Record<string, unknown>> {
    const objects = await client.listObjects();
    const results: Record<string, unknown>[] = [];

    for (const object of objects) {
      const content = await client.getObject(object);
      results.push({
        key: object,
        content,
      });
    }

    return {
      objects: results,
    };
  }

  private async processPostgresSource(client: PostgresDataSource): Promise<Record<string, unknown>> {
    const results = await client.execute();
    return {
      records: results,
    };
  }

  private async processApiSource(client: ApiDataSource): Promise<Record<string, unknown>> {
    return await client.execute();
  }
} 