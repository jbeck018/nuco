# Deployment Guide

## Prerequisites

### 1. Environment Setup
- Node.js 18+ and npm
- Docker and Docker Compose
- Cloudflare account (for R2)
- PostgreSQL database
- OpenAI API key
- Claude API key

### 2. Required Environment Variables
```env
# API Keys
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key

# Database
POSTGRES_URL=your_postgres_url

# Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET=your_bucket_name

# Authentication
NEXTAUTH_URL=your_app_url
NEXTAUTH_SECRET=your_secret
```

## Local Development

### 1. Clone Repository
```bash
git clone https://github.com/your-org/nuco.git
cd nuco
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

## Docker Deployment

### 1. Build Docker Image
```bash
docker build -t nuco:latest .
```

### 2. Run Container
```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your_key \
  -e CLAUDE_API_KEY=your_key \
  -e POSTGRES_URL=your_url \
  nuco:latest
```

### 3. Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - POSTGRES_URL=${POSTGRES_URL}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Cloud Deployment

### 1. Vercel Deployment

#### Configuration
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

#### Environment Variables
- Add all required environment variables in Vercel dashboard
- Configure build settings
- Set up domain and SSL

### 2. AWS Deployment

#### ECS Configuration
```json
{
  "family": "nuco",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole"
}
```

#### Task Definition
```json
{
  "containerDefinitions": [
    {
      "name": "nuco",
      "image": "nuco:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "OPENAI_API_KEY",
          "value": "your_key"
        }
      ]
    }
  ]
}
```

## Database Setup

### 1. PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE nuco;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_created_at ON agents(created_at);
```

### 2. R2 Setup
```bash
# Create bucket
r2 bucket create nuco-storage

# Configure CORS
r2 bucket cors put nuco-storage --cors-config cors.json
```

## Monitoring Setup

### 1. Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nuco'
    static_configs:
      - targets: ['localhost:3000']
```

### 2. Grafana Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Nuco Dashboard",
    "panels": [
      {
        "title": "Agent Executions",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "rate(agent_executions_total[5m])"
          }
        ]
      }
    ]
  }
}
```

## Security Configuration

### 1. SSL/TLS Setup
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### 2. Rate Limiting
```typescript
import { RateLimiter } from '@/lib/security/rate-limiter';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000,
  keyGenerator: (req) => req.ip
});
```

## Backup and Recovery

### 1. Database Backup
```bash
# Create backup
pg_dump -U postgres nuco > backup.sql

# Restore backup
psql -U postgres nuco < backup.sql
```

### 2. R2 Backup
```bash
# Sync bucket
r2 sync nuco-storage backup-bucket
```

## Scaling Configuration

### 1. Horizontal Scaling
```yaml
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nuco
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nuco
  template:
    metadata:
      labels:
        app: nuco
    spec:
      containers:
      - name: nuco
        image: nuco:latest
        ports:
        - containerPort: 3000
```

### 2. Load Balancing
```nginx
upstream nuco {
    least_conn;
    server nuco-1:3000;
    server nuco-2:3000;
    server nuco-3:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://nuco;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Maintenance

### 1. Health Checks
```typescript
import { HealthCheck } from '@/lib/health/health-check';

const healthCheck = new HealthCheck({
  checks: [
    {
      name: 'database',
      check: async () => {
        await postgresService.query('SELECT 1');
        return true;
      }
    },
    {
      name: 'storage',
      check: async () => {
        await r2Service.listBuckets();
        return true;
      }
    }
  ]
});
```

### 2. Logging
```typescript
import { Logger } from '@/lib/logging/logger';

const logger = new Logger({
  level: 'info',
  format: 'json',
  transports: [
    new FileTransport({ filename: 'error.log', level: 'error' }),
    new FileTransport({ filename: 'combined.log' })
  ]
});
```

## Troubleshooting

### 1. Common Issues
- Database connection issues
- API rate limiting
- Memory leaks
- Performance bottlenecks

### 2. Debug Tools
```typescript
import { Debugger } from '@/lib/debug/debugger';

const debugger = new Debugger({
  enabled: process.env.NODE_ENV === 'development',
  logLevel: 'debug'
});
``` 