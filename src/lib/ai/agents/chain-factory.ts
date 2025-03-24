import { AgentOrchestrator } from './orchestrator';
import { AgentChain, ChainConfig } from './chain';
import { db } from '@/lib/db';
import { agentChains } from '@/lib/db/schema/agents';
import { eq } from 'drizzle-orm';
import { AIServiceError } from '../error';

export class ChainFactory {
  private chains: Map<string, AgentChain> = new Map();
  private orchestrator: AgentOrchestrator;

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async createChain(config: ChainConfig): Promise<AgentChain> {
    // Check if chain already exists
    if (config.id && this.chains.has(config.id)) {
      return this.chains.get(config.id)!;
    }

    // Create new chain
    const chain = new AgentChain(config, this.orchestrator);
    await chain.initialize();

    // Store chain reference
    this.chains.set(chain.getState().id, chain);

    return chain;
  }

  async getChain(id: string): Promise<AgentChain> {
    // Check memory cache first
    if (this.chains.has(id)) {
      return this.chains.get(id)!;
    }

    // Load from database
    const chainData = await db.query.agentChains.findFirst({
      where: eq(agentChains.id, id)
    });

    if (!chainData) {
      throw new AIServiceError(`Chain ${id} not found`);
    }

    // Create chain instance
    const chain = new AgentChain(chainData.config as ChainConfig, this.orchestrator);
    this.chains.set(id, chain);

    return chain;
  }

  async listChains(): Promise<ChainConfig[]> {
    const chains = await db.query.agentChains.findMany();
    return chains.map(chain => chain.config as ChainConfig);
  }

  async deleteChain(id: string): Promise<void> {
    // Remove from memory cache
    this.chains.delete(id);

    // Delete from database
    await db.delete(agentChains).where(eq(agentChains.id, id));
  }

  async executeChain(id: string, context: any): Promise<any[]> {
    const chain = await this.getChain(id);
    return chain.execute(context);
  }

  // Helper method to create common chain patterns
  async createDataAnalysisChain(): Promise<AgentChain> {
    return this.createChain({
      name: 'Data Analysis Chain',
      description: 'Chain for gathering, analyzing, and exporting data',
      steps: [
        {
          agentId: 'data-gathering',
          outputTransform: (result) => ({
            ...result,
            type: 'gathered_data'
          })
        },
        {
          agentId: 'analysis',
          inputTransform: (context, previousResults) => ({
            ...context,
            data: previousResults[0]
          }),
          outputTransform: (result) => ({
            ...result,
            type: 'analysis_results'
          })
        },
        {
          agentId: 'export',
          inputTransform: (context, previousResults) => ({
            ...context,
            data: previousResults[1]
          })
        }
      ],
      maxConcurrentSteps: 1
    });
  }

  async createResearchChain(): Promise<AgentChain> {
    return this.createChain({
      name: 'Research Chain',
      description: 'Chain for web research and analysis',
      steps: [
        {
          agentId: 'web-research',
          outputTransform: (result) => ({
            ...result,
            type: 'research_data'
          })
        },
        {
          agentId: 'analysis',
          inputTransform: (context, previousResults) => ({
            ...context,
            data: previousResults[0]
          })
        }
      ],
      maxConcurrentSteps: 1
    });
  }
} 