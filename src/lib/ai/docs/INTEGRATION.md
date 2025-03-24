# Integration Guides

## System Integration

### 1. Provider Integration

#### OpenAI Integration
```typescript
import { OpenAIService } from '@/lib/ai/providers/openai';

const openaiService = new OpenAIService({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
  temperature: 0.7
});
```

#### Claude Integration
```typescript
import { ClaudeService } from '@/lib/ai/providers/claude';

const claudeService = new ClaudeService({
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-3-opus-20240229',
  temperature: 0.7
});
```

### 2. Storage Integration

#### R2 Integration
```typescript
import { R2Service } from '@/lib/storage/r2';

const r2Service = new R2Service({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: 'your-bucket-name'
});
```

#### Postgres Integration
```typescript
import { PostgresService } from '@/lib/database/postgres';

const postgresService = new PostgresService({
  connectionString: process.env.POSTGRES_URL,
  ssl: true
});
```

### 3. Authentication Integration

#### Next-Auth Integration
```typescript
import { AuthOptions } from 'next-auth';

export const authOptions: AuthOptions = {
  providers: [
    // Configure providers
  ],
  callbacks: {
    // Handle token refresh
  }
};
```

## Agent Integration

### 1. Creating Custom Agents

```typescript
import { BaseAgent, AgentConfig, AgentContext, AgentResult } from '@/lib/ai/agents/base';

class CustomAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    try {
      // Implementation
      return {
        success: true,
        output: result,
        metadata: {}
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error,
        metadata: {}
      };
    }
  }
}
```

### 2. Agent Registration

```typescript
import { AgentRegistry } from '@/lib/ai/registry';

const registry = new AgentRegistry();
registry.register('custom-agent', CustomAgent);
```

### 3. Agent Orchestration

```typescript
import { AgentOrchestrator } from '@/lib/ai/orchestrator';

const orchestrator = new AgentOrchestrator({
  registry,
  maxConcurrent: 5,
  timeout: 30000
});
```

## Dashboard Integration

### 1. Chart.js Integration

```typescript
import { ChartRenderer } from '@/lib/ai/agents/dashboard/chart';

const chartRenderer = ChartRenderer.getInstance();
await chartRenderer.renderChart('canvas-id', config, data);
```

### 2. Dashboard Components

```typescript
import { Dashboard, Chart } from '@/lib/ai/agents/dashboard/components';

const DashboardComponent = () => {
  return (
    <Dashboard config={config} agent={agent}>
      <Chart id="chart-1" config={chartConfig} data={chartData} />
    </Dashboard>
  );
};
```

### 3. Real-time Updates

```typescript
import { useDashboard } from '@/lib/ai/agents/dashboard/hooks';

const DashboardContainer = () => {
  const { config, chartData, loading, error } = useDashboard(agent, {
    refreshInterval: 30000
  });
  
  // Render dashboard
};
```

## API Integration

### 1. tRPC Router Setup

```typescript
import { router, publicProcedure } from '@/lib/trpc/trpc';

export const aiRouter = router({
  execute: publicProcedure
    .input(z.object({
      message: z.string(),
      context: z.any()
    }))
    .mutation(async ({ input }) => {
      // Implementation
    })
});
```

### 2. API Client Usage

```typescript
import { useTRPC } from '@/lib/trpc/trpc';

const Component = () => {
  const trpc = useTRPC();
  const mutation = trpc.ai.execute.useMutation();
  
  // Use mutation
};
```

## Error Handling

### 1. Global Error Handler

```typescript
import { ErrorBoundary } from '@/lib/error/error-boundary';

const App = () => {
  return (
    <ErrorBoundary fallback={<ErrorComponent />}>
      <MainContent />
    </ErrorBoundary>
  );
};
```

### 2. API Error Handling

```typescript
try {
  const result = await agent.execute(context);
  if (!result.success) {
    throw new Error(result.error?.message);
  }
} catch (error) {
  // Handle error
}
```

## Monitoring Integration

### 1. Metrics Collection

```typescript
import { MetricsCollector } from '@/lib/monitoring/metrics';

const metrics = new MetricsCollector();
metrics.recordExecution('agent-name', duration, success);
```

### 2. Logging

```typescript
import { Logger } from '@/lib/logging/logger';

const logger = new Logger();
logger.info('Agent execution started', { agentId, context });
```

## Security Integration

### 1. Rate Limiting

```typescript
import { RateLimiter } from '@/lib/security/rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000
});
```

### 2. Input Validation

```typescript
import { z } from 'zod';

const inputSchema = z.object({
  message: z.string().min(1),
  context: z.any()
});
```

## Performance Optimization

### 1. Caching

```typescript
import { Cache } from '@/lib/cache/cache';

const cache = new Cache({
  ttl: 3600,
  maxSize: 1000
});
```

### 2. Batch Processing

```typescript
import { BatchProcessor } from '@/lib/processing/batch';

const processor = new BatchProcessor({
  batchSize: 100,
  maxDelay: 1000
});
```

## Testing Integration

### 1. Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Agent', () => {
  it('should execute successfully', async () => {
    const agent = new CustomAgent(config);
    const result = await agent.execute(context);
    expect(result.success).toBe(true);
  });
});
```

### 2. Integration Tests

```typescript
import { setupTestEnvironment } from '@/lib/test/setup';

describe('System Integration', () => {
  const env = setupTestEnvironment();
  
  it('should handle full workflow', async () => {
    // Test implementation
  });
}); 