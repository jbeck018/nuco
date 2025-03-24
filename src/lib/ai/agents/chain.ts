import { BaseAgent, AgentContext, AgentResult } from './base';
import { AgentOrchestrator } from './orchestrator';
import { AIServiceError } from '../error';
import { EventEmitter } from 'events';
import { db } from '@/lib/db';
import { agentChains } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface ChainStep {
  agentId: string;
  inputTransform?: (context: AgentContext, previousResults: AgentResult[]) => AgentContext;
  outputTransform?: (result: AgentResult) => AgentResult;
  errorHandler?: (error: Error, context: AgentContext, previousResults: AgentResult[]) => Promise<AgentResult | null>;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface ChainConfig {
  id?: string;
  name: string;
  description: string;
  steps: ChainStep[];
  maxConcurrentSteps?: number;
  timeout?: number;
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface ChainState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  results: AgentResult[];
  errors: Error[];
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, any>;
}

export class AgentChain extends EventEmitter {
  private id: string;
  private config: ChainConfig;
  private orchestrator: AgentOrchestrator;
  private state: ChainState;
  private activeSteps: Set<number> = new Set();

  constructor(config: ChainConfig, orchestrator: AgentOrchestrator) {
    super();
    this.id = config.id || uuidv4();
    this.config = config;
    this.orchestrator = orchestrator;
    this.state = {
      id: this.id,
      status: 'pending',
      currentStep: 0,
      results: [],
      errors: [],
      startedAt: new Date(),
      metadata: {}
    };
  }

  async initialize(): Promise<void> {
    // Create chain record in database
    await db.insert(agentChains).values({
      id: this.id,
      name: this.config.name,
      description: this.config.description,
      config: this.config,
      status: 'pending',
      startedAt: new Date()
    });
  }

  async execute(context: AgentContext): Promise<AgentResult[]> {
    if (this.state.status !== 'pending') {
      throw new AIServiceError('Chain is already running or completed');
    }

    this.state.status = 'running';
    await this.updateChainState();

    try {
      while (this.state.currentStep < this.config.steps.length) {
        const step = this.config.steps[this.state.currentStep];
        
        // Check if we can run this step concurrently
        if (this.canRunConcurrently()) {
          await this.executeStep(step, context);
        } else {
          // Wait for active steps to complete
          await this.waitForActiveSteps();
          await this.executeStep(step, context);
        }
      }

      this.state.status = 'completed';
      this.state.completedAt = new Date();
      await this.updateChainState();

      return this.state.results;
    } catch (error) {
      this.state.status = 'failed';
      this.state.completedAt = new Date();
      this.state.errors.push(error instanceof Error ? error : new Error(String(error)));
      await this.updateChainState();
      throw error;
    }
  }

  private async executeStep(step: ChainStep, context: AgentContext): Promise<void> {
    const stepIndex = this.state.currentStep;
    this.activeSteps.add(stepIndex);

    try {
      // Transform input context if needed
      const transformedContext = step.inputTransform
        ? step.inputTransform(context, this.state.results)
        : context;

      // Execute agent
      const result = await this.orchestrator.executeAgent(
        step.agentId,
        transformedContext,
        this.config.steps.length - stepIndex // Higher priority for later steps
      );

      // Transform output if needed
      const transformedResult = step.outputTransform
        ? step.outputTransform(result)
        : result;

      this.state.results.push(transformedResult);
      this.state.currentStep++;
      await this.updateChainState();
    } catch (error) {
      // Handle error if error handler is provided
      if (step.errorHandler) {
        const recoveryResult = await step.errorHandler(
          error instanceof Error ? error : new Error(String(error)),
          context,
          this.state.results
        );

        if (recoveryResult) {
          this.state.results.push(recoveryResult);
          this.state.currentStep++;
          await this.updateChainState();
          return;
        }
      }

      throw error;
    } finally {
      this.activeSteps.delete(stepIndex);
    }
  }

  private canRunConcurrently(): boolean {
    const maxConcurrent = this.config.maxConcurrentSteps || 1;
    return this.activeSteps.size < maxConcurrent;
  }

  private async waitForActiveSteps(): Promise<void> {
    if (this.activeSteps.size === 0) return;

    return new Promise((resolve) => {
      const checkActive = () => {
        if (this.activeSteps.size === 0) {
          resolve();
        } else {
          setTimeout(checkActive, 100);
        }
      };
      checkActive();
    });
  }

  private async updateChainState(): Promise<void> {
    await db
      .update(agentChains)
      .set({
        status: this.state.status,
        currentStep: this.state.currentStep,
        results: this.state.results,
        errors: this.state.errors,
        completedAt: this.state.completedAt,
        metadata: this.state.metadata
      })
      .where(eq(agentChains.id, this.id));
  }

  getState(): ChainState {
    return { ...this.state };
  }

  getResults(): AgentResult[] {
    return [...this.state.results];
  }

  getErrors(): Error[] {
    return [...this.state.errors];
  }
} 