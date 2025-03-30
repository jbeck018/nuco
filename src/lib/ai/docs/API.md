# API Documentation

## Overview

The Nuco API provides endpoints for interacting with the AI agent system, managing dashboards, and handling data operations. All API endpoints are protected with authentication and rate limiting.

## Authentication

### API Key Authentication
```typescript
const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};
```

### OAuth2 Authentication
```typescript
const headers = {
  'Authorization': `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};
```

## Base URL

- Production: `https://api.nuco.ai/v1`
- Development: `http://localhost:3000/api/v1`

## Endpoints

### Agents

#### Execute Agent
```typescript
POST /agents/execute

Request:
{
  "agentId": string;
  "input": {
    "message": string;
    "context": Record<string, any>;
  };
}

Response:
{
  "success": boolean;
  "output": any;
  "metadata": Record<string, any>;
  "error"?: {
    "message": string;
    "code": string;
  };
}
```

#### List Agents
```typescript
GET /agents

Response:
{
  "agents": Array<{
    "id": string;
    "name": string;
    "type": string;
    "config": Record<string, any>;
    "createdAt": string;
  }>;
  "total": number;
  "page": number;
  "limit": number;
}
```

#### Get Agent
```typescript
GET /agents/:id

Response:
{
  "id": string;
  "name": string;
  "type": string;
  "config": Record<string, any>;
  "createdAt": string;
  "lastExecuted": string;
  "executionCount": number;
}
```

### Dashboards

#### Create Dashboard
```typescript
POST /dashboards

Request:
{
  "name": string;
  "description": string;
  "config": {
    "layout": Array<{
      "id": string;
      "type": string;
      "position": {
        "x": number;
        "y": number;
        "w": number;
        "h": number;
      };
      "config": Record<string, any>;
    }>;
  };
}

Response:
{
  "id": string;
  "name": string;
  "description": string;
  "config": Record<string, any>;
  "createdAt": string;
  "updatedAt": string;
}
```

#### Get Dashboard
```typescript
GET /dashboards/:id

Response:
{
  "id": string;
  "name": string;
  "description": string;
  "config": Record<string, any>;
  "data": Record<string, any>;
  "createdAt": string;
  "updatedAt": string;
}
```

#### Update Dashboard
```typescript
PUT /dashboards/:id

Request:
{
  "name"?: string;
  "description"?: string;
  "config"?: Record<string, any>;
}

Response:
{
  "id": string;
  "name": string;
  "description": string;
  "config": Record<string, any>;
  "updatedAt": string;
}
```

### Data Operations

#### Upload Data
```typescript
POST /data/upload

Request:
FormData {
  file: File;
  type: string;
  metadata?: Record<string, any>;
}

Response:
{
  "id": string;
  "url": string;
  "type": string;
  "metadata": Record<string, any>;
  "createdAt": string;
}
```

#### Get Data
```typescript
GET /data/:id

Response:
{
  "id": string;
  "url": string;
  "type": string;
  "metadata": Record<string, any>;
  "createdAt": string;
  "content"?: any;
}
```

### Analytics

#### Get Analytics
```typescript
GET /analytics

Query Parameters:
{
  startDate?: string;
  endDate?: string;
  metrics?: string[];
}

Response:
{
  "metrics": Record<string, number>;
  "timeSeries": Array<{
    "timestamp": string;
    "values": Record<string, number>;
  }>;
}
```

## Error Handling

### Error Response Format
```typescript
{
  "error": {
    "code": string;
    "message": string;
    "details"?: Record<string, any>;
  };
}
```

### Common Error Codes
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623456789
```

### Rate Limit Rules
- 100 requests per minute per API key
- 1000 requests per hour per API key
- Burst limit of 10 requests per second

## Webhooks

### Register Webhook
```typescript
POST /webhooks

Request:
{
  "url": string;
  "events": string[];
  "secret"?: string;
}

Response:
{
  "id": string;
  "url": string;
  "events": string[];
  "createdAt": string;
}
```

### Webhook Events
- `agent.executed`
- `dashboard.updated`
- `data.uploaded`
- `error.occurred`

### Webhook Payload
```typescript
{
  "event": string;
  "timestamp": string;
  "data": Record<string, any>;
  "signature": string;
}
```

## SDK Examples

### TypeScript SDK
```typescript
import { NucoClient } from '@nuco/sdk';

const client = new NucoClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.nuco.ai/v1'
});

// Execute agent
const result = await client.agents.execute({
  agentId: 'agent-123',
  input: {
    message: 'Hello, world!',
    context: {}
  }
});

// Create dashboard
const dashboard = await client.dashboards.create({
  name: 'My Dashboard',
  description: 'A sample dashboard',
  config: {
    layout: []
  }
});
```

### Python SDK
```python
from nuco import NucoClient

client = NucoClient(
    api_key='your-api-key',
    base_url='https://api.nuco.ai/v1'
)

# Execute agent
result = client.agents.execute(
    agent_id='agent-123',
    input={
        'message': 'Hello, world!',
        'context': {}
    }
)

# Create dashboard
dashboard = client.dashboards.create(
    name='My Dashboard',
    description='A sample dashboard',
    config={
        'layout': []
    }
)
```

## Best Practices

### 1. Error Handling
```typescript
try {
  const result = await client.agents.execute({
    agentId: 'agent-123',
    input: { message: 'Hello' }
  });
} catch (error) {
  if (error.code === '429') {
    // Handle rate limiting
  } else if (error.code === '401') {
    // Handle authentication
  }
}
```

### 2. Retry Logic
```typescript
const retry = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
```

### 3. Rate Limiting
```typescript
const rateLimit = async (fn: () => Promise<any>, limit = 100, window = 60000) => {
  const queue: Array<() => Promise<any>> = [];
  let count = 0;
  let reset = Date.now() + window;

  const execute = async () => {
    if (queue.length === 0) return;
    
    if (count >= limit) {
      if (Date.now() < reset) {
        await new Promise(resolve => setTimeout(resolve, reset - Date.now()));
      }
      count = 0;
      reset = Date.now() + window;
    }

    const fn = queue.shift();
    if (fn) {
      count++;
      await fn();
      execute();
    }
  };

  queue.push(fn);
  execute();
};
``` 