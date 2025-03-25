import { BaseAgent, AgentState, AgentContext, AgentResult, AgentConfig } from './base';
import { RecoveryManager, RecoveryConfig } from './recovery';
import { CacheManager, CacheConfig } from './cache';
import { AIServiceError } from '../error';
import { EventEmitter } from 'events';
import { generateCompletion } from '../service';
import { StreamTextResult, ToolSet } from 'ai';
import { db } from '@/lib/db';
import { agents, agentExecutions, type Agent } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import { AIService } from '../service';
import { AgentFactory } from './factory';

export interface AgentRegistration {
  id: string;
  agent: BaseAgent;
  config: AgentConfig;
  state: AgentState;
  dependencies: string[];
  resources: {
    memory: number;      // Memory in MB
    cpu: number;         // CPU units (1 = 100ms CPU time)
    network: number;     // Network bandwidth in MB/s
    storage?: number;    // Storage in MB
    custom?: Record<string, number>;  // Custom resource requirements
  };
  capabilities: {
    requiresStorage?: boolean;
    maxConcurrentExecutions?: number;
    timeout?: number;
    retryable?: boolean;
    edgeCompatible?: boolean;  // Whether the agent can run in edge environment
  };
}

// Extended AgentConfig to include type
export interface ExtendedAgentConfig extends AgentConfig {
  type?: string;
}

export interface ResourceAllocation {
  total: {
    memory: number;
    cpu: number;
    network: number;
  };
  allocated: {
    memory: number;
    cpu: number;
    network: number;
  };
  available: {
    memory: number;
    cpu: number;
    network: number;
  };
}

export interface OrchestratorConfig {
  maxConcurrentAgents: number;
  resourceLimits: {
    memory: number;
    cpu: number;
    network: number;
  };
  retryConfig: {
    maxAttempts: number;
    backoffMs: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
  };
  pagesConfig?: {
    maxDuration: number;
    maxMemory: number;
    maxRequests: number;
  };
  cacheConfig?: Partial<CacheConfig>;
  recoveryConfig?: Partial<RecoveryConfig>;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, AgentRegistration> = new Map();
  private resources: ResourceAllocation;
  private config: OrchestratorConfig;
  private taskQueue: Array<{
    agentId: string;
    context: AgentContext;
    priority: number;
    timestamp: number;
  }> = [];
  private isProcessing: boolean = false;
  private monitoringInterval: NodeJS.Timeout | undefined;
  private requestCount: number = 0;
  private cacheManager: CacheManager;
  private recoveryManager: RecoveryManager;

  constructor(config: OrchestratorConfig) {
    super();
    const defaultPagesConfig = {
      maxDuration: 30,    // Default 30s for Pages Functions
      maxMemory: 128,     // Default 128MB for Pages Functions
      maxRequests: 100,   // Default concurrent requests
    };
    
    this.config = {
      ...config,
      pagesConfig: {
        ...defaultPagesConfig,
        ...(config.pagesConfig || {})
      },
      recoveryConfig: {
        maxRetries: 3,
        backoffFactor: 2,
        maxBackoffMs: 30000,
        retryableErrors: [
          'rate_limit',
          'timeout',
          'network_error',
          'server_error'
        ],
        circuitBreaker: {
          threshold: 5,
          resetTimeout: 60000
        },
        ...config.recoveryConfig
      }
    };
    this.resources = {
      total: { ...config.resourceLimits },
      allocated: { memory: 0, cpu: 0, network: 0 },
      available: { ...config.resourceLimits },
    };
    
    // Initialize cache manager with Pages-optimized settings
    this.cacheManager = new CacheManager({
      enabled: true,
      defaultTTL: 300, // 5 minutes default
      maxSize: 100,    // Reduced for Pages
      maxMemory: 32,   // Reduced for Pages
      compression: true,
      ...config.cacheConfig
    });
    this.recoveryManager = new RecoveryManager(this.config.recoveryConfig);
  }

  async initialize(): Promise<void> {
    if (this.config.monitoring.enabled) {
      this.startMonitoring();
    }
  }

  async registerAgent(agent: BaseAgent, config: ExtendedAgentConfig, dependencies: string[] = []): Promise<void> {
    const id = config.id || crypto.randomUUID();
    
    // First check if agent already exists in database
    const existingAgent = await db.query.agents.findFirst({
      where: eq(agents.id, id)
    }) as Agent | undefined;

    if (existingAgent) {
      // If agent exists, just update its state and register in memory
      await db.update(agents)
        .set({
          state: {
            status: 'idle',
            lastUpdated: new Date(),
            metadata: {}
          },
          updatedAt: new Date()
        })
        .where(eq(agents.id, id));

      const agentMetadata = existingAgent.metadata as {
        capabilities: AgentRegistration['capabilities'];
        resources: AgentRegistration['resources'];
      };

      // Register in memory
      this.agents.set(id, {
        id,
        agent,
        config,
        state: {
          id: crypto.randomUUID(),
          status: 'idle',
          lastUpdated: new Date(),
          metadata: {},
        },
        dependencies,
        resources: agentMetadata.resources,
        capabilities: agentMetadata.capabilities
      });

      this.emit('agentRegistered', { 
        id, 
        config, 
        capabilities: agentMetadata.capabilities 
      });
      
      return;
    }

    // Validate dependencies
    for (const depId of dependencies) {
      if (!this.agents.has(depId)) {
        throw new AIServiceError(`Dependency agent ${depId} not found`);
      }
    }

    // Initialize agent
    await agent.initialize(config);

    // Get agent capabilities
    const capabilities = await agent.getCapabilities?.() || {
      requiresStorage: false,
      maxConcurrentExecutions: 1,
      timeout: 30000,
      retryable: true,
      edgeCompatible: true
    };

    // Calculate resource requirements based on capabilities and Pages limits
    const resources = {
      memory: Math.min(128, capabilities.requiresStorage ? 100 : 64),  // Respect Pages memory limit
      cpu: 1,       // Default CPU allocation
      network: 10,  // Default network allocation
      storage: capabilities.requiresStorage ? 50 : 0,  // Reduced storage for Pages
      custom: {}
    };

    // Register new agent in database
    await db.insert(agents).values({
      id,
      name: config.name || 'Default Agent',
      description: config.description || 'Auto-registered agent',
      type: config.type || 'default',
      config: {
        ...config,
        // Remove circular references before storing
        aiService: undefined
      },
      state: {
        status: 'idle',
        lastUpdated: new Date(),
        metadata: {}
      },
      metadata: {
        capabilities,
        resources,
        dependencies
      },
      isActive: true
    });

    // Register agent in memory
    this.agents.set(id, {
      id,
      agent,
      config,
      state: {
        id: crypto.randomUUID(),
        status: 'idle',
        lastUpdated: new Date(),
        metadata: {},
      },
      dependencies,
      resources,
      capabilities
    });

    this.emit('agentRegistered', { id, config, capabilities });
  }

  /**
   * Uses the LLM to determine the most appropriate agent for the given context
   */
  private async selectAgent(context: AgentContext): Promise<string> {
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage) return crypto.randomUUID(); // Generate UUID for default case

    // Get all available agents and their descriptions
    const agentDescriptions = Array.from(this.agents.entries()).map(([id, registration]) => ({
      id,
      name: registration.config.name,
      description: registration.config.description,
      capabilities: registration.capabilities
    }));

    // If no agents are registered, return a default UUID
    if (agentDescriptions.length === 0) {
      return crypto.randomUUID();
    }

    // Create a prompt for the LLM to analyze the query and select the best agent
    const prompt = `You are an agent selector that determines which AI agent is best suited to handle a user's query.

Available agents:
${agentDescriptions.map(agent => `- ${agent.name} (${agent.id}): ${agent.description}`).join('\n')}

User query: "${lastMessage.content}"

Based on the user's query and the available agents, which agent would be most appropriate to handle this request? 
Consider the agent's description and capabilities when making your decision.
If no specialized agent is needed, respond with the ID of the first agent.

Respond with ONLY the agent ID, nothing else.`;

    try {
      // Use the AI service to get the agent selection using the model from context
      const result = await generateCompletion(
        [{ 
          role: 'system', 
          content: prompt,
        }],
        {
          modelId: context.config.model,
          temperature: 0.1, // Low temperature for consistent selection
          maxTokens: 50,
          organizationId: context.metadata.organizationId as string | undefined,
          useCustomTokens: context.metadata.useCustomTokens as boolean | undefined,
          customTokens: context.metadata.customTokens as Record<string, string> | undefined,
        }
      );

      // Convert the stream to text
      const text = await this.streamToString(result);
      const selectedAgentId = text.trim().toLowerCase();
      
      // Validate the selected agent exists
      if (this.agents.has(selectedAgentId)) {
        return selectedAgentId;
      }

      // If the selected agent doesn't exist, return the first agent's ID
      const firstAgent = this.agents.values().next().value;
      if (firstAgent) {
        console.warn(`Selected agent ${selectedAgentId} not found, using first available agent ${firstAgent.id}`);
        return firstAgent.id;
      }

      // If no agents are available, generate a new UUID
      return crypto.randomUUID();
    } catch (error) {
      console.error('Error selecting agent:', error);
      // Generate a new UUID if agent selection fails
      return crypto.randomUUID();
    }
  }

  /**
   * Converts a StreamTextResult to a string
   */
  private async streamToString(stream: StreamTextResult<ToolSet, never>): Promise<string> {
    const dataStream = stream.toDataStream();
    const reader = dataStream.getReader();
    let result = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += new TextDecoder().decode(value);
      }
    } finally {
      reader.releaseLock();
    }

    return result;
  }

  async executeAgent(agentId: string, context: AgentContext, priority: number = 0): Promise<AgentResult> {
    // If this is already a default agent execution, don't try to select another agent
    if (agentId === 'default') {
      const registration = this.agents.get(agentId);
      if (registration) {
        return this.executeAgentInternal(registration, context, priority);
      }
    }

    // Use LLM to select the most appropriate agent
    const selectedAgentId = await this.selectAgent(context);
    
    // Get the selected agent
    const registration = this.agents.get(selectedAgentId);
    if (!registration) {
      // Create default agent capabilities
      const defaultCapabilities = {
        requiresStorage: false,
        maxConcurrentExecutions: 1,
        timeout: 30000,
        retryable: true,
        edgeCompatible: true
      };

      // Create default agent resources
      const defaultResources = {
        memory: 64,  // Default memory allocation
        cpu: 1,      // Default CPU allocation
        network: 10, // Default network allocation
        storage: 0,  // No storage by default
        custom: {}
      };

      const defaultAgentId = 'default';
      
      // Create AIService instance
      const aiService = new AIService();
      await aiService.initialize({
        modelId: context.config.model,
        organizationId: context.metadata.organizationId as string
      });

      // Create agent factory instance with AIService
      const agentFactory = AgentFactory.getInstance({
        defaultModelId: context.config.model,
        defaultSystemPrompt: context.config.systemPrompt,
        metadata: context.metadata,
      }, aiService);

      // Create default agent through factory
      const defaultAgent = await agentFactory.createAgent('default', {
        id: defaultAgentId,
        name: 'Default Agent',
        description: 'Handles general chat responses',
        model: context.config.model,
        aiService: aiService,
      });

      // Register the agent in the database first
      await db.insert(agents).values({
        id: defaultAgentId,
        name: 'Default Agent',
        description: 'Handles general chat responses',
        type: 'default',
        config: {
          model: context.config.model,
        },
        state: {
          status: 'idle',
          lastUpdated: new Date(),
          metadata: {}
        },
        metadata: {
          capabilities: defaultCapabilities,
          resources: defaultResources,
          dependencies: []
        },
        isActive: true
      });

      // Then register with the orchestrator
      await this.registerAgent(defaultAgent, {
        id: defaultAgentId,
        name: 'Default Agent',
        description: 'Handles general chat responses',
        model: context.config.model,
        aiService: aiService,
        type: 'default'
      });

      return this.executeAgentInternal(this.agents.get(defaultAgentId)!, context, priority);
    }

    return this.executeAgentInternal(registration, context, priority);
  }

  private async executeAgentInternal(
    registration: AgentRegistration,
    context: AgentContext,
    priority: number
  ): Promise<AgentResult> {
    // Check request limits
    if (this.requestCount >= (this.config.pagesConfig?.maxRequests || 0)) {
      throw new AIServiceError('Maximum concurrent requests reached');
    }

    this.requestCount++;

    try {
      // Generate cache key based on agent ID and context
      const cacheKey = this.generateCacheKey(registration.id, context);

      // Try to get from cache first
      const cachedResult = await this.cacheManager.get<AgentResult>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Check dependencies
      for (const depId of registration.dependencies) {
        const depRegistration = this.agents.get(depId);
        if (depRegistration?.state.status !== 'completed') {
          throw new AIServiceError(`Dependency agent ${depId} not completed`);
        }
      }

      // Add to task queue
      this.taskQueue.push({
        agentId: registration.id,
        context,
        priority,
        timestamp: Date.now(),
      });

      // Sort queue by priority and timestamp
      this.taskQueue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processTaskQueue();
      }

      // Wait for completion with Pages function timeout
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new AIServiceError(`Agent ${registration.id} execution timed out`));
        }, (this.config.pagesConfig?.maxDuration || 30) * 1000);

        this.once(`agentCompleted:${registration.id}`, async (result) => {
          clearTimeout(timeout);
          // Cache the result
          await this.cacheManager.set(cacheKey, result, 300); // 5 minute TTL
          resolve(result);
        });

        this.once(`agentFailed:${registration.id}`, (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      const recoveryContext = {
        agentId: registration.id,
        executionId: context.executionId,
        attempt: context.attempt || 0,
        lastError: error instanceof Error ? error : new Error(String(error)),
        state: registration.state
      };

      try {
        const result = await this.recoveryManager.recover(error instanceof Error ? error : new Error(String(error)), recoveryContext);
        if (result) {
          return result;
        }
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }

      throw error;
    } finally {
      this.requestCount--;
    }
  }

  private generateCacheKey(agentId: string, keyData: Record<string, any>): string {
    // Generate a deterministic cache key using UUID
    return `agent:${agentId}:${crypto.randomUUID()}`;
  }

  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];
      const registration = this.agents.get(task.agentId);
      if (!registration) {
        this.taskQueue.shift();
        continue;
      }

      // Check if agent is edge compatible
      if (!registration.capabilities.edgeCompatible) {
        console.warn(`Agent ${task.agentId} is not edge compatible and may have performance issues`);
      }

      // Check resource availability
      if (!this.hasAvailableResources(registration.resources)) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced wait time for Pages
        continue;
      }

      // Allocate resources
      this.allocateResources(registration.resources);

      // Create execution record
      const executionId = crypto.randomUUID();
      await db.insert(agentExecutions).values({
        id: executionId,
        agentId: task.agentId,
        status: 'running',
        startedAt: new Date(),
        input: task.context
      });

      try {
        // Update agent state
        registration.state.status = 'running';
        registration.state.lastUpdated = new Date();

        // Execute agent with Pages function timeout
        const timeout = Math.min(
          registration.capabilities.timeout || 30000,
          this.config.pagesConfig?.maxDuration ? this.config.pagesConfig.maxDuration * 1000 : 30000
        );
        
        const result = await Promise.race([
          registration.agent.execute(task.context),
          new Promise((_, reject) => 
            setTimeout(() => reject(new AIServiceError('Agent execution timed out')), timeout)
          )
        ]);

        // Update execution record
        await db
          .update(agentExecutions)
          .set({
            status: 'completed',
            completedAt: new Date(),
            output: { data: result }
          })
          .where(eq(agentExecutions.id, executionId));

        // Update agent state
        registration.state.status = 'completed';
        registration.state.lastUpdated = new Date();

        // Emit completion event
        this.emit(`agentCompleted:${task.agentId}`, result);
      } catch (error) {
        // Update execution record
        await db
          .update(agentExecutions)
          .set({
            status: 'failed',
            completedAt: new Date(),
            output: { error: error instanceof Error ? error : new Error(String(error)) }
          })
          .where(eq(agentExecutions.id, executionId));

        // Update agent state
        registration.state.status = 'failed';
        registration.state.lastUpdated = new Date();

        // Emit failure event
        this.emit(`agentFailed:${task.agentId}`, error instanceof Error ? error : new Error(String(error)));

        throw error;
      }
    }
  }

  private hasAvailableResources(resources: {
    memory: number;
    cpu: number;
    network: number;
  }): boolean {
    return (
      this.resources.available.memory >= resources.memory &&
      this.resources.available.cpu >= resources.cpu &&
      this.resources.available.network >= resources.network
    );
  }

  private allocateResources(resources: {
    memory: number;
    cpu: number;
    network: number;
  }): void {
    this.resources.allocated.memory += resources.memory;
    this.resources.allocated.cpu += resources.cpu;
    this.resources.allocated.network += resources.network;
    this.resources.available.memory -= resources.memory;
    this.resources.available.cpu -= resources.cpu;
    this.resources.available.network -= resources.network;
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const metrics = {
        timestamp: new Date().toISOString(),
        activeAgents: this.agents.size,
        queuedTasks: this.taskQueue.length,
        resources: this.resources,
        agentStates: Array.from(this.agents.entries()).map(([id, registration]) => ({
          id,
          status: registration.state.status,
          lastUpdated: registration.state.lastUpdated,
        })),
      };

      this.emit('metrics', metrics);
    }, this.config.monitoring.metricsInterval);
  }

  private async generateTaskId(agentId: string, _context: AgentContext): Promise<string> {
    // Generate a unique task ID using UUID
    return crypto.randomUUID();
  }
}