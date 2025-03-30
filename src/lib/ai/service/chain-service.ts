import { AgentOrchestrator } from '../agents/orchestrator';
import { ChainFactory } from '../agents/chain-factory';
import { AgentChain, ChainConfig, ChainState } from '../agents/chain';
import { db } from '@/lib/db';
import { agentChains } from '@/lib/db/schema/agents';
import { eq, and, lt } from 'drizzle-orm';
import { AIServiceError } from '../error';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ChainMetrics {
  totalChains: number;
  activeChains: number;
  failedChains: number;
  averageExecutionTime: number;
  successRate: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    network: number;
  };
}

export class ChainService extends EventEmitter {
  private factory: ChainFactory;
  private orchestrator: AgentOrchestrator;
  private metrics: ChainMetrics;
  private recoveryInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(orchestrator: AgentOrchestrator) {
    super();
    this.orchestrator = orchestrator;
    this.factory = new ChainFactory(orchestrator);
    this.metrics = {
      totalChains: 0,
      activeChains: 0,
      failedChains: 0,
      averageExecutionTime: 0,
      successRate: 0,
      resourceUsage: {
        memory: 0,
        cpu: 0,
        network: 0
      }
    };
  }

  async initialize(): Promise<void> {
    // Start recovery process for failed chains
    this.startRecoveryProcess();
    // Start metrics monitoring
    this.startMetricsMonitoring();
    // Load initial metrics
    await this.updateMetrics();
  }

  async createChain(config: ChainConfig): Promise<AgentChain> {
    const chain = await this.factory.createChain(config);
    this.metrics.totalChains++;
    await this.updateMetrics();
    return chain;
  }

  async getChain(id: string): Promise<AgentChain> {
    return this.factory.getChain(id);
  }

  async listChains(): Promise<ChainConfig[]> {
    return this.factory.listChains();
  }

  async deleteChain(id: string): Promise<void> {
    await this.factory.deleteChain(id);
    this.metrics.totalChains--;
    await this.updateMetrics();
  }

  async executeChain(id: string, context: any): Promise<any[]> {
    const chain = await this.getChain(id);
    this.metrics.activeChains++;
    await this.updateMetrics();

    try {
      const results = await chain.execute(context);
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalChains - 1) + 1) / this.metrics.totalChains;
      return results;
    } catch (error) {
      this.metrics.failedChains++;
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalChains - 1)) / this.metrics.totalChains;
      throw error;
    } finally {
      this.metrics.activeChains--;
      await this.updateMetrics();
    }
  }

  private async recoverFailedChains(): Promise<void> {
    const failedChains = await db.query.agentChains.findMany({
      where: and(
        eq(agentChains.status, 'failed'),
        lt(agentChains.completedAt, new Date(Date.now() - 5 * 60 * 1000)) // Only recover chains failed more than 5 minutes ago
      )
    });

    for (const chainData of failedChains) {
      try {
        const chain = await this.factory.getChain(chainData.id);
        const state = chain.getState();
        
        // Check if chain is recoverable
        if (this.isChainRecoverable(state)) {
          // Reset chain state
          await db.update(agentChains)
            .set({
              status: 'pending',
              currentStep: 0,
              results: [],
              errors: [],
              completedAt: null
            })
            .where(eq(agentChains.id, chainData.id));

          // Emit recovery event
          this.emit('chainRecovered', { chainId: chainData.id });
        }
      } catch (error) {
        console.error(`Failed to recover chain ${chainData.id}:`, error);
      }
    }
  }

  private isChainRecoverable(state: ChainState): boolean {
    // Check if chain has retryable errors
    const retryableErrors = state.errors.filter(error => {
      if (!(error instanceof AIServiceError)) {
        return false;
      }
      return error.code === 'rate_limit' || 
             error.code === 'timeout' || 
             error.code === 'network_error';
    });

    return retryableErrors.length > 0;
  }

  private startRecoveryProcess(): void {
    // Run recovery every 5 minutes
    this.recoveryInterval = setInterval(() => {
      this.recoverFailedChains().catch(console.error);
    }, 5 * 60 * 1000);
  }

  private startMetricsMonitoring(): void {
    // Update metrics every minute
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics().catch(console.error);
    }, 60 * 1000);
  }

  private async updateMetrics(): Promise<void> {
    const chains = await db.query.agentChains.findMany();
    
    // Calculate execution times
    const completedChains = chains.filter(chain => chain.status === 'completed');
    const totalExecutionTime = completedChains.reduce((sum, chain) => {
      const startTime = new Date(chain.startedAt).getTime();
      const endTime = new Date(chain.completedAt!).getTime();
      return sum + (endTime - startTime);
    }, 0);

    this.metrics.averageExecutionTime = completedChains.length > 0 
      ? totalExecutionTime / completedChains.length 
      : 0;

    // Update resource usage
    const activeChains = chains.filter(chain => chain.status === 'running');
    this.metrics.resourceUsage = activeChains.reduce((usage, chain) => {
      const config = chain.config as ChainConfig;
      return {
        memory: usage.memory + (config.maxConcurrentSteps || 1) * 128, // 128MB per concurrent step
        cpu: usage.cpu + (config.maxConcurrentSteps || 1),
        network: usage.network + (config.maxConcurrentSteps || 1) * 10 // 10MB/s per concurrent step
      };
    }, { memory: 0, cpu: 0, network: 0 });

    // Emit metrics update
    this.emit('metricsUpdated', this.metrics);
  }

  getMetrics(): ChainMetrics {
    return { ...this.metrics };
  }

  async cleanup(): Promise<void> {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
} 