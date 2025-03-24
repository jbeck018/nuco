/**
 * Base Agent Interface and Implementation
 * 
 * This file provides the foundation for all agents in the system,
 * integrating with the existing AI service and provider system.
 */

import { Message, CompletionOptions, generateCompletion, AIService } from '../service';
import { ModelConfig } from '../config';
import { AIServiceError } from '../error';

/**
 * Agent state interface
 */
export interface AgentState {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastUpdated: Date;
  metadata: Record<string, unknown>;
}

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  modelConfig?: ModelConfig;
  systemPrompt?: string;
  maxRetries?: number;
  timeout?: number;
  metadata?: Record<string, unknown>;
  enabled?: boolean;
  model: string;
  aiService: AIService;
  // Add Pages-specific config
  pagesConfig?: {
    maxDuration?: number;  // Max duration in seconds
    maxMemory?: number;    // Max memory in MB
    maxRequests?: number;  // Max concurrent requests
  };
}

/**
 * Agent execution context
 */
export interface AgentContext {
  messages: Message[];
  state: AgentState;
  config: AgentConfig;
  metadata: Record<string, unknown>;
  data?: unknown;
  executionId: string;
  attempt?: number;
}

/**
 * Agent execution result
 */
export interface AgentResult {
  success: boolean;
  output: unknown | null;
  error?: Error;
  metadata: Record<string, unknown>;
}

/**
 * Base Agent Interface
 */
export interface IAgent {
  // Core lifecycle methods
  initialize(config: AgentConfig): Promise<void>;
  execute(context: AgentContext): Promise<AgentResult>;
  cleanup(): Promise<void>;
  
  // State management
  getState(): AgentState;
  updateState(updates: Partial<AgentState>): Promise<void>;
  
  // Error handling
  handleError(error: Error): Promise<void>;
  
  // Provider integration
  generateCompletion(messages: Message[], options?: CompletionOptions): Promise<unknown>;

  // Capabilities
  getCapabilities?(): Promise<{
    requiresStorage?: boolean;
    maxConcurrentExecutions?: number;
    timeout?: number;
    retryable?: boolean;
    edgeCompatible?: boolean;
  }>;
}

/**
 * Base Agent Implementation
 */
export abstract class BaseAgent implements IAgent {
  protected state: AgentState;
  protected config: AgentConfig;
  protected context: AgentContext | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.state = {
      id: crypto.randomUUID(),
      status: 'idle',
      lastUpdated: new Date(),
      metadata: {},
    };
  }

  /**
   * Initialize the agent with configuration
   */
  async initialize(config: AgentConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.updateState({ status: 'idle' });
  }

  /**
   * Execute the agent's main logic
   */
  abstract execute(context: AgentContext): Promise<AgentResult>;

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.context = null;
    await this.updateState({ status: 'idle' });
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Update agent state
   */
  async updateState(updates: Partial<AgentState>): Promise<void> {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdated: new Date(),
    };
  }

  /**
   * Handle errors during execution
   */
  async handleError(error: Error): Promise<void> {
    console.error(`Agent error: ${error.message}`, {
      name: error.name,
      stack: error.stack,
    });
    await this.updateState({
      status: 'failed',
      metadata: {
        ...this.state.metadata,
        lastError: error.message,
        errorStack: error.stack,
      },
    });
  }

  /**
   * Generate completion using the AI service
   */
  public async generateCompletion(
    messages: Message[],
    options: CompletionOptions = {}
  ): Promise<unknown> {
    try {
      const completionOptions: CompletionOptions = {
        ...options,
        modelId: this.config.modelConfig?.id || this.config.model,
        systemPrompt: this.config.systemPrompt,
      };

      // Use the provider-specific service if available
      if (this.config.aiService) {
        return await this.config.aiService.generateCompletion(messages, completionOptions);
      }

      // Fallback to generic completion
      return await generateCompletion(messages, completionOptions);
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        error instanceof Error ? error.message : 'Unknown error',
        'custom',
        'unknown'
      );
    }
  }

  /**
   * Validate agent configuration
   */
  protected validateConfig(config: AgentConfig): void {
    if (!config.id) {
      throw new Error('Agent ID is required');
    }
    if (!config.name) {
      throw new Error('Agent name is required');
    }
    if (!config.description) {
      throw new Error('Agent description is required');
    }
  }

  /**
   * Validate agent configuration for edge compatibility
   */
  protected validateEdgeCompatibility(config: AgentConfig): void {
    // Validate memory usage
    const estimatedMemory = this.estimateMemoryUsage(config);
    const maxMemory = config.pagesConfig?.maxMemory || 128; // Default to 128MB for Pages
    if (estimatedMemory > maxMemory) {
      console.warn(`Agent may exceed Pages function memory limit of ${maxMemory}MB`);
    }

    // Validate execution time
    const maxDuration = config.pagesConfig?.maxDuration || 30; // Default to 30s for Pages
    if (config.timeout && config.timeout > maxDuration * 1000) {
      console.warn(`Agent timeout exceeds Pages function limit of ${maxDuration}s`);
    }

    // Validate concurrent requests
    const maxRequests = config.pagesConfig?.maxRequests || 100;
    if (config.maxRetries && config.maxRetries > maxRequests) {
      console.warn(`Agent retries exceed Pages function request limit of ${maxRequests}`);
    }
  }

  /**
   * Estimate memory usage based on configuration
   */
  private estimateMemoryUsage(config: AgentConfig): number {
    let memory = 32; // Reduced base memory usage for Pages

    // Add memory for model context
    if (config.modelConfig?.contextWindow) {
      memory += Math.ceil(config.modelConfig.contextWindow / 2048); // More conservative token-to-MB conversion
    }

    // Add memory for system prompt
    if (config.systemPrompt) {
      memory += Math.ceil(config.systemPrompt.length / (2 * 1024 * 1024)); // More conservative string-to-MB conversion
    }

    // Add memory for metadata
    if (config.metadata) {
      memory += Math.ceil(JSON.stringify(config.metadata).length / (2 * 1024 * 1024));
    }

    return memory;
  }

  /**
   * Get agent capabilities
   */
  async getCapabilities(): Promise<{
    requiresStorage?: boolean;
    maxConcurrentExecutions?: number;
    timeout?: number;
    retryable?: boolean;
    edgeCompatible?: boolean;
  }> {
    return {
      requiresStorage: false,
      maxConcurrentExecutions: 1,
      timeout: 30000,
      retryable: true,
      edgeCompatible: true
    };
  }
} 