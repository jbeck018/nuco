import { Redis } from '@upstash/redis';
import { getEnv } from '@/lib/env';

/**
 * Redis client for distributed state management
 */
const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = getEnv();

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Key prefixes for different types of state
 */
const KEY_PREFIXES = {
  AGENT_STATE: 'agent:state:',
  AGENT_EXECUTION: 'agent:execution:',
  AGENT_LOCK: 'agent:lock:',
  AGENT_UPDATE: 'agent:update:',
} as const;

/**
 * Redis state manager for agents
 */
export class RedisStateManager {
  /**
   * Get agent state
   */
  async getAgentState(agentId: string): Promise<Record<string, unknown> | null> {
    const key = `${KEY_PREFIXES.AGENT_STATE}${agentId}`;
    const state = await redis.get<Record<string, unknown>>(key);
    return state;
  }

  /**
   * Set agent state
   */
  async setAgentState(
    agentId: string,
    state: Record<string, unknown>,
    ttl?: number
  ): Promise<void> {
    const key = `${KEY_PREFIXES.AGENT_STATE}${agentId}`;
    if (ttl) {
      await redis.set(key, state, { ex: ttl });
    } else {
      await redis.set(key, state);
    }

    // Record the update timestamp
    const updateKey = `${KEY_PREFIXES.AGENT_UPDATE}${agentId}`;
    await redis.set(updateKey, Date.now());
  }

  /**
   * Delete agent state
   */
  async deleteAgentState(agentId: string): Promise<void> {
    const key = `${KEY_PREFIXES.AGENT_STATE}${agentId}`;
    const updateKey = `${KEY_PREFIXES.AGENT_UPDATE}${agentId}`;
    await redis.del(key, updateKey);
  }

  /**
   * Get agent execution state
   */
  async getAgentExecution(
    executionId: string
  ): Promise<Record<string, unknown> | null> {
    const key = `${KEY_PREFIXES.AGENT_EXECUTION}${executionId}`;
    const execution = await redis.get<Record<string, unknown>>(key);
    return execution;
  }

  /**
   * Set agent execution state
   */
  async setAgentExecution(
    executionId: string,
    state: Record<string, unknown>,
    ttl?: number
  ): Promise<void> {
    const key = `${KEY_PREFIXES.AGENT_EXECUTION}${executionId}`;
    if (ttl) {
      await redis.set(key, state, { ex: ttl });
    } else {
      await redis.set(key, state);
    }
  }

  /**
   * Delete agent execution state
   */
  async deleteAgentExecution(executionId: string): Promise<void> {
    const key = `${KEY_PREFIXES.AGENT_EXECUTION}${executionId}`;
    await redis.del(key);
  }

  /**
   * Acquire a lock for an agent
   */
  async acquireLock(
    agentId: string,
    ttl: number = 30
  ): Promise<boolean> {
    const key = `${KEY_PREFIXES.AGENT_LOCK}${agentId}`;
    const acquired = await redis.set(key, '1', {
      nx: true,
      ex: ttl,
    });
    return acquired === 'OK';
  }

  /**
   * Release a lock for an agent
   */
  async releaseLock(agentId: string): Promise<void> {
    const key = `${KEY_PREFIXES.AGENT_LOCK}${agentId}`;
    await redis.del(key);
  }

  /**
   * Subscribe to agent state changes using polling
   */
  async subscribeToAgentState(
    agentId: string,
    callback: (state: Record<string, unknown>) => void,
    pollInterval: number = 1000
  ): Promise<() => void> {
    const stateKey = `${KEY_PREFIXES.AGENT_STATE}${agentId}`;
    const updateKey = `${KEY_PREFIXES.AGENT_UPDATE}${agentId}`;
    let lastUpdate = await redis.get<number>(updateKey) || 0;

    // Start polling
    const interval = setInterval(async () => {
      const currentUpdate = await redis.get<number>(updateKey);
      
      if (currentUpdate && currentUpdate > lastUpdate) {
        const state = await redis.get<Record<string, unknown>>(stateKey);
        if (state) {
          callback(state);
          lastUpdate = currentUpdate;
        }
      }
    }, pollInterval);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  /**
   * Publish agent state changes
   */
  async publishAgentState(
    agentId: string,
    state: Record<string, unknown>
  ): Promise<void> {
    await this.setAgentState(agentId, state);
  }
} 