# Development Guide

## Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- Git
- Docker and Docker Compose
- PostgreSQL
- Redis
- IDE with TypeScript support

### 2. Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/nuco.git
cd nuco

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development environment
npm run dev
```

### 3. Development Environment
```typescript
// .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/nuco
REDIS_URL=redis://localhost:6379
```

## Project Structure

### 1. Directory Layout
```
src/
├── lib/
│   ├── ai/
│   │   ├── agents/
│   │   ├── providers/
│   │   └── orchestrator/
│   ├── database/
│   ├── storage/
│   └── utils/
├── components/
├── pages/
└── styles/
```

### 2. Key Files
- `src/lib/ai/agents/base.ts`: Base agent implementation
- `src/lib/ai/orchestrator.ts`: Agent orchestration logic
- `src/components/chat/chat-interface.tsx`: Main chat interface
- `src/lib/database/postgres.ts`: Database service
- `src/lib/storage/r2.ts`: Storage service

## Development Workflow

### 1. Branch Strategy
```bash
# Feature branch
git checkout -b feature/your-feature

# Bug fix branch
git checkout -b fix/your-bug

# Release branch
git checkout -b release/v1.0.0
```

### 2. Commit Guidelines
```bash
# Format
type(scope): description

# Examples
feat(agent): add new agent type
fix(chat): resolve message display issue
docs(api): update endpoint documentation
```

### 3. Code Review Process
1. Create pull request
2. Request review from team members
3. Address feedback
4. Merge after approval

## Agent Development

### 1. Creating New Agents
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

### 3. Agent Testing
```typescript
import { describe, it, expect } from 'vitest';

describe('CustomAgent', () => {
  it('should execute successfully', async () => {
    const agent = new CustomAgent(config);
    const result = await agent.execute(context);
    expect(result.success).toBe(true);
  });
});
```

## API Development

### 1. Creating Endpoints
```typescript
import { router, publicProcedure } from '@/lib/trpc/trpc';

export const apiRouter = router({
  endpoint: publicProcedure
    .input(z.object({
      // Input validation
    }))
    .mutation(async ({ input }) => {
      // Implementation
    })
});
```

### 2. API Testing
```typescript
import { createTRPCProxyClient } from '@trpc/client';

const client = createTRPCProxyClient<AppRouter>({
  url: 'http://localhost:3000/api/trpc'
});

describe('API', () => {
  it('should handle request', async () => {
    const result = await client.endpoint.mutate({
      // Test data
    });
    expect(result).toBeDefined();
  });
});
```

## Frontend Development

### 1. Component Development
```typescript
import { FC } from 'react';

interface Props {
  // Component props
}

export const Component: FC<Props> = (props) => {
  // Implementation
};
```

### 2. State Management
```typescript
import { create } from 'zustand';

interface Store {
  state: State;
  actions: Actions;
}

export const useStore = create<Store>((set) => ({
  state: {},
  actions: {}
}));
```

### 3. Styling
```typescript
// Tailwind CSS
<div className="flex items-center justify-center p-4">
  {/* Content */}
</div>

// CSS Modules
import styles from './Component.module.css';

<div className={styles.container}>
  {/* Content */}
</div>
```

## Database Development

### 1. Schema Changes
```sql
-- Create migration
CREATE TABLE new_table (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_new_table_name ON new_table(name);
```

### 2. Query Optimization
```typescript
// Use prepared statements
const query = await db.query(
  'SELECT * FROM table WHERE id = $1',
  [id]
);

// Use transactions
await db.transaction(async (client) => {
  await client.query('INSERT INTO table (id) VALUES ($1)', [id]);
  await client.query('UPDATE table SET status = $1 WHERE id = $2', ['active', id]);
});
```

## Testing

### 1. Unit Testing
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Service', () => {
  it('should process data', async () => {
    const service = new Service();
    const result = await service.process(data);
    expect(result).toBeDefined();
  });
});
```

### 2. Integration Testing
```typescript
import { setupTestEnvironment } from '@/lib/test/setup';

describe('Integration', () => {
  const env = setupTestEnvironment();
  
  it('should handle workflow', async () => {
    // Test implementation
  });
});
```

### 3. E2E Testing
```typescript
import { test, expect } from '@playwright/test';

test('should complete workflow', async ({ page }) => {
  await page.goto('/');
  await page.fill('input', 'test');
  await page.click('button');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Performance Optimization

### 1. Code Splitting
```typescript
// Dynamic imports
const Component = dynamic(() => import('./Component'), {
  loading: () => <Loading />
});

// Route-based splitting
const routes = {
  '/': lazy(() => import('./pages/Home')),
  '/dashboard': lazy(() => import('./pages/Dashboard'))
};
```

### 2. Caching
```typescript
// API caching
const cache = new Cache({
  ttl: 3600,
  maxSize: 1000
});

// Data caching
const data = await cache.get(key) || await fetchData();
```

### 3. Bundle Optimization
```typescript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000
    }
  }
};
```

## Debugging

### 1. Logging
```typescript
import { Logger } from '@/lib/logging/logger';

const logger = new Logger({
  level: 'debug',
  format: 'json'
});

logger.debug('Debug message', { context });
```

### 2. Error Tracking
```typescript
import { ErrorTracker } from '@/lib/error/tracker';

const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN
});

try {
  // Code
} catch (error) {
  tracker.capture(error);
}
```

### 3. Performance Monitoring
```typescript
import { PerformanceMonitor } from '@/lib/monitoring/performance';

const monitor = new PerformanceMonitor();

monitor.startSpan('operation');
// Code
monitor.endSpan();
```

## Deployment

### 1. Build Process
```bash
# Build application
npm run build

# Run tests
npm run test

# Generate documentation
npm run docs
```

### 2. Docker Build
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### 3. CI/CD Pipeline
```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run test
```

## Documentation

### 1. Code Documentation
```typescript
/**
 * Service description
 * @param {string} param - Parameter description
 * @returns {Promise<Result>} Result description
 */
async function service(param: string): Promise<Result> {
  // Implementation
}
```

### 2. API Documentation
```typescript
/**
 * @api {post} /api/endpoint Endpoint description
 * @apiName EndpointName
 * @apiGroup Group
 * @apiParam {String} param Parameter description
 * @apiSuccess {Object} result Result description
 */
```

### 3. Component Documentation
```typescript
/**
 * Component description
 * @component
 * @example
 * <Component prop="value" />
 */
```

## Best Practices

### 1. Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful variable names
- Add proper type annotations

### 2. Performance
- Implement proper caching
- Use pagination for large datasets
- Optimize database queries
- Minimize bundle size
- Use proper loading states

### 3. Security
- Validate all inputs
- Sanitize outputs
- Use proper authentication
- Implement rate limiting
- Follow security best practices 