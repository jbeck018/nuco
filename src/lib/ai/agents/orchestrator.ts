import { BaseAgent, AgentState, AgentContext, AgentResult, AgentConfig } from './base';
import { RecoveryManager, RecoveryConfig } from './recovery';
import { CacheManager, CacheConfig } from './cache';
import { AIServiceError } from '../error';
import { EventEmitter } from 'events';
import { generateCompletion } from '../service';
import { StreamTextResult, ToolSet, Message } from 'ai';
import { AIService } from '../service';
import { AgentFactory } from './factory';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { ModelConfig } from '../config';

const DEFAULT_AGENT_ID = '00000000-0000-4000-8000-000000000001'; // Consistent UUID for default agent

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
  swarmRole: 'worker' | 'coordinator' | 'specialist';
  swarmMetadata: {
    specialization?: string[];
    taskPreference?: string[];
    performance?: {
      successRate: number;
      avgResponseTime: number;
    };
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

export interface SwarmTask {
  id: string;
  type: string;
  priority: number;
  context: AgentContext;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  assignedAgent?: string;
  results: AgentResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SwarmMetrics {
  activeAgents: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number;
  successRate: number;
  agentUtilization: Record<string, number>;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, AgentRegistration> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
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
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly MAX_MESSAGE_HISTORY = 5;
  private readonly MAX_CONCURRENT_TASKS = 10;
  private readonly MAX_TASK_QUEUE = 100;

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
      maxSize: 50,     // Reduced for Pages
      maxMemory: 16,   // Reduced for Pages
      compression: true,
      ...config.cacheConfig
    });
    this.recoveryManager = new RecoveryManager(this.config.recoveryConfig);
  }

  private performGarbageCollection(): void {
    // Clear completed agent states
    for (const [id, registration] of this.agents.entries()) {
      if (registration.state.status === 'completed') {
        registration.state.metadata = {};
        registration.agent.cleanup();
      }
    }

    // Clear old tasks if queue is too large
    if (this.taskQueue.length > this.MAX_QUEUE_SIZE) {
      this.taskQueue = this.taskQueue.slice(-this.MAX_QUEUE_SIZE);
    }
  }

  async initialize(): Promise<void> {
    if (this.config.monitoring.enabled) {
      this.startMonitoring();
    }
  }

  async registerAgent(agent: BaseAgent, config: ExtendedAgentConfig, dependencies: string[] = []): Promise<void> {
    const id = config.id || crypto.randomUUID();
    
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

    // Determine swarm role based on agent type and capabilities
    const swarmRole = this.determineSwarmRole(config, capabilities);

    // Register agent in memory with minimal metadata
    this.agents.set(id, {
      id,
      agent,
      config: {
        ...config,
        metadata: {} // Clear metadata to save memory
      },
      state: {
        id: crypto.randomUUID(),
        status: 'idle',
        lastUpdated: new Date(),
        metadata: {},
      },
      dependencies,
      resources,
      capabilities,
      swarmRole,
      swarmMetadata: {
        specialization: config.type ? [config.type] : [],
        taskPreference: [],
        performance: {
          successRate: 1.0,
          avgResponseTime: 0
        }
      }
    });

    this.emit('agentRegistered', { 
      id, 
      config: { ...config, metadata: {} }, 
      capabilities,
      swarmRole
    });
  }

  private determineSwarmRole(config: ExtendedAgentConfig, capabilities: AgentRegistration['capabilities']): AgentRegistration['swarmRole'] {
    // Specialized agents become specialists
    if (config.type && config.type !== 'default') {
      return 'specialist';
    }
    
    // Agents with high concurrency become coordinators
    if (capabilities.maxConcurrentExecutions && capabilities.maxConcurrentExecutions > 5) {
      return 'coordinator';
    }
    
    // Default to worker
    return 'worker';
  }

  /**
   * Uses the LLM to determine the most appropriate agent for the given context
   */
  private async selectAgent(context: AgentContext): Promise<string> {
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage) return DEFAULT_AGENT_ID;

    // If this is a completion request (indicated by metadata), skip agent selection
    if (context.metadata.isCompletionRequest) {
      // Return first available agent or default
      const firstAgent = this.agents.values().next().value;
      return firstAgent ? firstAgent.id : DEFAULT_AGENT_ID;
    }

    // Get all available agents and their descriptions
    const agentDescriptions = Array.from(this.agents.entries()).map(([id, registration]) => ({
      id,
      name: registration.config.name,
      description: registration.config.description,
      capabilities: registration.capabilities
    }));

    // If no agents are registered, return default
    if (agentDescriptions.length === 0) {
      return DEFAULT_AGENT_ID;
    }

    // Create a prompt for the LLM to analyze the query and select the best agent
    const prompt = `You are an agent selector that determines which AI agent is best suited to handle a user's query.

Available agents:
${agentDescriptions.map(agent => `- ${agent.name} (${agent.id}): ${agent.description}`).join('\n')}

User query: "${lastMessage.content}"

Based on the user's query and the available agents, which agent would be most appropriate to handle this request? 
Consider the agent's description and capabilities when making your decision.
If no specialized agent is needed, respond with '${DEFAULT_AGENT_ID}'.

Respond with ONLY the agent ID, nothing else.`;

    try {
      // Use a simpler completion call without recursion
      const messages: Message[] = [{ 
        role: 'system',
        content: prompt,
        id: crypto.randomUUID()
      }];

      // Use the provider-specific completion directly
      const provider = context.config.model.startsWith('gpt') ? 'openai' : 'anthropic';
      const client = provider === 'openai' 
        ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
        : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const result = await streamText({
        model: client(context.config.model),
        messages,
        temperature: 0.1, // Low temperature for consistent selection
        maxTokens: 50,
        topP: 1
      });

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

      return DEFAULT_AGENT_ID;
    } catch (error) {
      console.error('Error selecting agent:', error);
      // Return default if agent selection fails
      return DEFAULT_AGENT_ID;
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

  async executeTask(context: AgentContext, priority: number = 0): Promise<AgentResult> {
    const taskId = crypto.randomUUID();
    const task: SwarmTask = {
      id: taskId,
      type: this.determineTaskType(context),
      priority,
      context,
      status: 'pending',
      results: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(taskId, task);
    this.emit('taskCreated', task);

    // Start swarm processing if not already running
    if (!this.isProcessing) {
      this.processSwarm();
    }

    try {
      // Process the task directly
      await this.processTask(task);
      
      // Return the last result from the task
      const lastResult = task.results[task.results.length - 1];
      if (!lastResult) {
        throw new AIServiceError('No results were generated for the task');
      }
      
      return lastResult;
    } catch (error) {
      // If the error is already an AIServiceError, rethrow it
      if (error instanceof AIServiceError) {
        throw error;
      }
      
      // Create a new AIServiceError with the error information
      const aiError = new AIServiceError(
        error instanceof Error ? error.message : String(error),
        context.config.modelConfig?.provider || 'unknown',
        'unknown',
        error instanceof Error && 'status' in error ? (error as any).status : undefined
      );
      throw aiError;
    }
  }

  private determineTaskType(context: AgentContext): string {
    // Analyze context to determine task type
    const lastMessage = context.messages[context.messages.length - 1];
    if (!lastMessage) return 'general';

    // Simple task type determination based on message content
    const content = lastMessage.content.toLowerCase();
    if (content.includes('analyze') || content.includes('analysis')) return 'analysis';
    if (content.includes('research') || content.includes('search')) return 'research';
    if (content.includes('generate') || content.includes('create')) return 'generation';
    return 'general';
  }

  private async processSwarm(): Promise<void> {
    if (this.isProcessing || this.tasks.size === 0) return;
    this.isProcessing = true;

    try {
      // Get pending tasks
      const pendingTasks = Array.from(this.tasks.values())
        .filter(task => task.status === 'pending')
        .sort((a, b) => b.priority - a.priority);

      // Process tasks in parallel with concurrency limit
      const taskBatches = this.chunkArray(pendingTasks, this.MAX_CONCURRENT_TASKS);
      
      for (const batch of taskBatches) {
        await Promise.all(batch.map(task => this.processTask(task)));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processTask(task: SwarmTask): Promise<void> {
    try {
      // Find suitable agents for the task
      const suitableAgents = this.findSuitableAgents(task);
      
      if (suitableAgents.length === 0) {
        // Instead of throwing an error, mark the task for direct LLM completion
        task.status = 'completed';
        task.results.push({
          success: true,
          output: null,
          metadata: {
            fallbackToDirectLLM: true,
            messages: task.context.messages,
            model: task.context.config.model,
            modelConfig: task.context.config.modelConfig
          }
        });
        task.updatedAt = new Date();
        this.emit(`taskCompleted:${task.id}`, task.results[0]);
        return;
      }

      // Select best agent based on performance metrics
      const selectedAgent = this.selectBestAgent(suitableAgents, task);
      
      // Update task status
      task.status = 'in_progress';
      task.assignedAgent = selectedAgent.id;
      task.updatedAt = new Date();

      // Ensure model configuration is properly passed to the agent
      const agentContext: AgentContext = {
        ...task.context,
        config: {
          ...task.context.config,
          modelConfig: task.context.config.modelConfig || task.context.metadata.modelConfig as ModelConfig
        }
      };

      // Execute agent with updated context
      const result = await selectedAgent.agent.execute(agentContext);
      
      // Update task with result
      task.status = 'completed';
      task.results.push(result);
      task.updatedAt = new Date();

      // Update agent performance metrics
      this.updateAgentPerformance(selectedAgent.id, result);

      // Emit completion event
      this.emit(`taskCompleted:${task.id}`, result);
    } catch (error) {
      // Update task status and add error result
      task.status = 'failed';
      task.updatedAt = new Date();
      
      // Create error result with detailed information
      const errorResult: AgentResult = {
        success: false,
        output: null,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          model: task.context.config.model,
          modelConfig: task.context.config.modelConfig,
          agentId: task.assignedAgent,
          errorType: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        }
      };
      
      task.results.push(errorResult);
      
      // Emit failure event with the error result
      this.emit(`taskFailed:${task.id}`, errorResult.error);
      throw errorResult.error;
    }
  }

  private findSuitableAgents(task: SwarmTask): AgentRegistration[] {
    return Array.from(this.agents.values()).filter(agent => {
      // Check if agent is idle
      if (agent.state.status !== 'idle') return false;
      
      // Check specialization match
      if (task.type !== 'general' && 
          agent.swarmMetadata.specialization && 
          !agent.swarmMetadata.specialization.includes(task.type)) {
        return false;
      }
      
      // Check task preference
      if (agent.swarmMetadata.taskPreference && 
          !agent.swarmMetadata.taskPreference.includes(task.type)) {
        return false;
      }
      
      return true;
    });
  }

  private selectBestAgent(agents: AgentRegistration[], task: SwarmTask): AgentRegistration {
    // Sort agents by performance metrics
    return agents.sort((a, b) => {
      const aScore = this.calculateAgentScore(a, task);
      const bScore = this.calculateAgentScore(b, task);
      return bScore - aScore;
    })[0];
  }

  private calculateAgentScore(agent: AgentRegistration, task: SwarmTask): number {
    let score = 0;
    
    // Ensure performance metrics exist
    const performance = agent.swarmMetadata.performance || {
      successRate: 1.0,
      avgResponseTime: 0
    };
    
    // Consider success rate
    score += performance.successRate * 0.4;
    
    // Consider response time (inverse)
    const maxResponseTime = 10000; // 10 seconds
    const responseTimeScore = Math.max(0, 1 - (performance.avgResponseTime / maxResponseTime));
    score += responseTimeScore * 0.3;
    
    // Consider specialization match
    if (agent.swarmMetadata.specialization?.includes(task.type)) {
      score += 0.3;
    }
    
    return score;
  }

  private updateAgentPerformance(agentId: string, result: AgentResult): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Ensure performance metrics exist
    if (!agent.swarmMetadata.performance) {
      agent.swarmMetadata.performance = {
        successRate: 1.0,
        avgResponseTime: 0
      };
    }

    const performance = agent.swarmMetadata.performance;
    const now = Date.now();
    
    // Update success rate
    performance.successRate = (performance.successRate * 0.9) + (result.success ? 0.1 : 0);
    
    // Update average response time
    const responseTime = now - new Date(agent.state.lastUpdated).getTime();
    performance.avgResponseTime = (performance.avgResponseTime * 0.9) + (responseTime * 0.1);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  getSwarmMetrics(): SwarmMetrics {
    const activeAgents = Array.from(this.agents.values()).filter(a => a.state.status === 'running').length;
    const pendingTasks = Array.from(this.tasks.values()).filter(t => t.status === 'pending').length;
    const completedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;
    const failedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'failed').length;
    
    const agentUtilization = Array.from(this.agents.entries()).reduce((acc, [id, agent]) => {
      acc[id] = agent.state.status === 'running' ? 1 : 0;
      return acc;
    }, {} as Record<string, number>);

    return {
      activeAgents,
      pendingTasks,
      completedTasks,
      failedTasks,
      avgResponseTime: this.calculateAverageResponseTime(),
      successRate: this.calculateSuccessRate(),
      agentUtilization
    };
  }

  private calculateAverageResponseTime(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed');
    
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, task) => {
      return sum + (new Date(task.updatedAt).getTime() - new Date(task.createdAt).getTime());
    }, 0);
    
    return totalTime / completedTasks.length;
  }

  private calculateSuccessRate(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed');
    
    if (completedTasks.length === 0) return 0;
    
    const successfulTasks = completedTasks.filter(t => 
      t.results.some(r => r.success)
    );
    
    return successfulTasks.length / completedTasks.length;
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

  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) return;

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      const registration = this.agents.get(task.agentId);
      if (!registration) continue;

      try {
        // Update agent state
        registration.state.status = 'running';
        registration.state.lastUpdated = new Date();

        // Ensure model configuration is properly passed
        const agentContext: AgentContext = {
          ...task.context,
          config: {
            ...task.context.config,
            modelConfig: task.context.config.modelConfig || task.context.metadata.modelConfig as ModelConfig
          }
        };
        
        const result = await registration.agent.execute(agentContext);

        // Update agent state with minimal metadata
        registration.state.status = 'completed';
        registration.state.lastUpdated = new Date();
        registration.state.metadata = {};

        // Emit completion event
        this.emit(`agentCompleted:${task.agentId}`, result);
      } catch (error) {
        // Update agent state
        registration.state.status = 'failed';
        registration.state.lastUpdated = new Date();

        // Emit failure event
        this.emit(`agentFailed:${task.agentId}`, error instanceof Error ? error : new Error(String(error)));

        throw error;
      }
    }

    this.isProcessing = false;
  }
}