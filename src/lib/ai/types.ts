export interface AgentState {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  output: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

export interface Message {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

export interface CompletionOptions {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  metadata?: any;
  executionId?: string;
  attempt?: number;
  organizationId?: string;
  useCustomTokens?: boolean;
  customTokens?: Record<string, string>;
  systemPrompt?: string;
  functions?: any[];
  userId?: string;
}

export interface AIService {
  generateCompletion(messages: Message[], options?: CompletionOptions): Promise<unknown>;
  generateEmbeddings?(text: string): Promise<number[]>;
  countTokens?(text: string): Promise<number>;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
} 