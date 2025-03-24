/**
 * Agent Factory
 * 
 * This file provides the factory for creating and configuring agents,
 * handling dependency injection and configuration management.
 */

import { AgentConfig, BaseAgent } from './base';
import { ModelConfig, getModelById } from '../config';
import { AIServiceError } from '../error';
import { AIService } from '../service';

/**
 * Agent type registry
 */
export type AgentType = new () => BaseAgent;

/**
 * Agent factory configuration
 */
export interface AgentFactoryConfig {
  defaultModelId?: string;
  defaultSystemPrompt?: string;
  maxRetries?: number;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Agent Factory
 */
export class AgentFactory {
  private static instance: AgentFactory;
  private agentTypes: Map<string, AgentType> = new Map();
  private config: AgentFactoryConfig;
  private aiService: AIService;

  private constructor(config: AgentFactoryConfig = {}, aiService: AIService) {
    this.config = config;
    this.aiService = aiService;
  }

  /**
   * Get the singleton instance of the factory
   */
  public static getInstance(config?: AgentFactoryConfig, aiService?: AIService): AgentFactory {
    if (!AgentFactory.instance) {
      if (!aiService) {
        throw new AIServiceError('AI service is required for agent factory initialization');
      }
      AgentFactory.instance = new AgentFactory(config, aiService);
    }
    return AgentFactory.instance;
  }

  /**
   * Register an agent type
   */
  public registerAgentType(id: string, agentType: AgentType): void {
    this.agentTypes.set(id, agentType);
  }

  /**
   * Create an agent instance
   */
  public async createAgent(
    agentId: string,
    config: Partial<AgentConfig> = {}
  ): Promise<BaseAgent> {
    const agentType = this.agentTypes.get(agentId);
    if (!agentType) {
      throw new AIServiceError(
        `Agent type ${agentId} not found`,
        'custom',
        'invalid_agent_type'
      );
    }

    // Create agent instance
    const agent = new agentType();

    // Prepare configuration
    const agentConfig: AgentConfig = {
      id: config.id || crypto.randomUUID(),
      name: config.name || agentId,
      description: config.description || `Agent of type ${agentId}`,
      modelConfig: config.modelConfig || this.getDefaultModelConfig(),
      systemPrompt: config.systemPrompt || this.config.defaultSystemPrompt,
      maxRetries: config.maxRetries || this.config.maxRetries,
      timeout: config.timeout || this.config.timeout,
      metadata: {
        ...this.config.metadata,
        ...config.metadata,
      },
      enabled: config.enabled ?? true,
      model: config.modelConfig?.id || 'gpt-4',
      aiService: this.aiService
    };

    // Initialize agent
    await agent.initialize(agentConfig);

    return agent;
  }

  /**
   * Get default model configuration
   */
  private getDefaultModelConfig(): ModelConfig | undefined {
    if (!this.config.defaultModelId) {
      return undefined;
    }

    const modelConfig = getModelById(this.config.defaultModelId);
    if (!modelConfig) {
      throw new AIServiceError(
        `Default model ${this.config.defaultModelId} not found`,
        'custom',
        'invalid_model'
      );
    }

    return modelConfig;
  }

  /**
   * Update factory configuration
   */
  public updateConfig(config: Partial<AgentFactoryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get registered agent types
   */
  public getRegisteredAgentTypes(): string[] {
    return Array.from(this.agentTypes.keys());
  }

  /**
   * Check if an agent type is registered
   */
  public hasAgentType(id: string): boolean {
    return this.agentTypes.has(id);
  }
} 