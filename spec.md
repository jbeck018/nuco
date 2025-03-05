# Nuco-App MVP Specification

## Overview
Nuco-App is a Next.js application designed to provide AI-powered integrations with various business tools. The MVP will focus on authentication, integrations with popular business platforms, and a simple prompting interface.

## Tech Stack
- **Frontend**: Next.js with App Router and React Server Components
- **Language**: TypeScript with strict mode
- **UI**: Tailwind CSS with shadcn/ui components and Radix UI primitives
- **Animation**: Framer Motion for enhanced UI interactions
- **State Management**: TanStack Query for data fetching and caching
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: NextAuth.js with Iron Session for stateless sessions
- **Database**: PostgreSQL with Drizzle ORM and pgvector extension for vector storage
- **API Layer**: Type-safe API routes with tRPC
- **Package Manager**: Bun
- **Deployment**: Vercel with Edge Runtime for critical routes
- **AI**: Vercel AI SDK for LLM integrations
- **API Integrations**: Salesforce, HubSpot, Google, Slack
- **Payment Processing**: Stripe (utilizing startup discounts)
- **Email**: Resend for transactional emails
- **Code Quality**: ESLint, Prettier, Husky, and lint-staged

## MVP Features

### 1. Authentication System
- [x] Email/password authentication
- [x] Magic link authentication
- [x] Google OAuth authentication
- [x] Salesforce OAuth authentication
- [x] HubSpot OAuth authentication
- [x] Session management with Iron Session
- [x] User profile management
- [x] Rate limiting with Upstash Rate Limit
- [x] CSRF protection

### 2. Organization Framework
- [x] Multi-tenant architecture
- [x] Organization CRUD operations
- [x] Role-based permissions (owner, admin, member)
- [x] Organization membership management
- [x] User-organization relationship
- [x] Organization settings management
- [x] Billing and subscription management

### 3. External Integrations
- [x] OAuth2 integration with:
  - [x] Salesforce
  - [x] HubSpot
  - [x] Google
  - [x] Slack
- [x] Token storage and refresh mechanism
- [x] Basic data fetching from integrated platforms
- [x] Integration management UI
- [x] Slack bot implementation with event handling and slash commands
- [x] Organization-specific integration settings
- [x] Polling for updates using tRPC and TanStack Query

### 4. Backend Infrastructure
- [x] PostgreSQL database setup with pgvector extension
- [x] Drizzle ORM schema and migrations
- [x] Type-safe API routes with tRPC
- [x] API routes for authentication
- [x] API routes for integration management
- [x] API routes for organization management
- [ ] Metadata storage for user preferences and settings
- [ ] Edge functions for global performance

### 5. External API Management
- [x] Token configuration system
- [ ] API key management for:
  - [x] OpenAI
  - [x] Slack (with Socket Mode and Block Kit)
  - [ ] Other future integrations
- [x] Secure credential storage
- [x] Webhook handling for real-time events

### 6. AI Integration
- [x] Vercel AI SDK implementation
- [x] Token management for various LLM providers
- [ ] Support for custom LLM providers
- [x] Usage tracking and quota management
- [x] Vector storage using PostgreSQL pgvector extension
- [x] OpenAI Function Calling for structured outputs (foundation implemented)

### 7. Prompting Interface
- [x] Chat-based interface for AI interactions
- [x] Streaming responses with optimistic UI updates
- [x] Prompt history and management
- [x] Prompt templates and saving
- [ ] Advanced animations with Framer Motion

### 8. Extension Framework
- [x] Architecture for future extensions:
  - [x] Slack app with Block Kit UI
  - [x] Chrome extension
  - [x] Salesforce application
- [x] API endpoints for extension communication
- [x] Webhook functionality for real-time updates
- [x] Extension manifest schema for configuration
- [x] Extension loading and lifecycle management
- [x] Extension sandboxing for security
- [x] Extension marketplace UI
- [x] Extension settings management

### 9. UI/UX
- [x] Responsive design
- [x] Light/dark mode toggle
- [x] shadcn/ui component integration with Radix UI primitives
- [x] Consistent theming across the application
- [ ] Data visualization with Recharts where needed

### 10. Payment Infrastructure
- [x] Stripe integration with startup discount program
- [x] Subscription model using Stripe Billing
- [x] Usage-based billing preparation
- [x] Fast/slow prompt tier system (similar to Cursor.ai)
- [x] Self-service subscription management with Stripe Customer Portal
- [x] Automated tax calculation with Stripe Tax

### 10. Documentation
- [x] Setup and installation instructions
- [x] API documentation
- [x] Authentication setup guide
- [x] Google OAuth setup guide
- [x] Deployment guide
- [ ] User guide
- [ ] Developer guide

## Implementation Plan

### Phase 1: Project Setup and Authentication
1. [x] Initialize Next.js project with App Router and TypeScript (strict mode)
2. [x] Set up Tailwind CSS, shadcn/ui, and Radix UI primitives
3. [x] Configure ESLint, Prettier, Husky, and lint-staged for code quality
4. [x] Implement theme switching (light/dark mode)
5. [x] Configure NextAuth.js
6. [x] Set up PostgreSQL with pgvector extension and Drizzle ORM
7. [x] Implement user authentication flows
8. [x] Set up tRPC for type-safe API routes

### Phase 2: Core Infrastructure
1. [x] Design and implement database schema with Drizzle
2. [x] Create type-safe API routes with tRPC
3. [x] Set up integration framework for OAuth2
4. [x] Implement token management system
5. [x] Create user dashboard with TanStack Query for data fetching
6. [x] Implement polling mechanism with tRPC and TanStack Query for updates
7. [x] Implement optimistic UI updates for better UX
8. [x] Implement metadata storage for user preferences and settings

### Phase 3: AI Integration
1. [x] Integrate Vercel AI SDK
2. [x] Set up PostgreSQL pgvector for vector storage
3. [x] Implement token management for LLM providers
4. [x] Create prompting interface with streaming and Framer Motion animations
5. [x] Implement OpenAI Function Calling for structured outputs (foundation)
6. [x] Set up usage tracking

### Phase 4: Organization Framework
1. [x] Design and implement organization database schema
2. [x] Create organization management service
3. [x] Implement organization membership system
4. [x] Set up role-based permissions
5. [x] Create organization settings UI
6. [x] Implement organization context provider
7. [x] Set up organization access control middleware

### Phase 5: Integrations
1. [x] Implement Salesforce OAuth and data access (with Composite API)
2. [ ] Implement Microsoft Teams integration
3. [ ] Set up webhooks for integration events
4. [ ] Implement automation rules for integrations
5. [ ] Create integration activity logs
6. [ ] Implement bulk import/export features

### Phase 6: Advanced Features
1. [ ] Implement real-time notifications with web sockets
2. [ ] Set up background jobs with Bull MQ for longer tasks
3. [ ] Create an activity timeline for users and organizations
4. [ ] Implement advanced search with pgvector
5. [ ] Set up audit logging and compliance features
6. [ ] Implement analytics dashboard

## Current Focus

We have completed optimistic UI updates to enhance the user experience, particularly for data mutations. This provides:
- Immediate UI feedback when users perform actions
- Perceived performance improvements by showing changes before server confirmation
- Graceful error handling with automatic rollback if operations fail
- Smooth transitions between states

Implementation progress:
- [x] Type safety improvements for tRPC/TanStack Query integrations
- [x] Organization-specific integration management
- [x] User profile updates with optimistic UI feedback
- [x] Integration management optimistic updates (connection/disconnection)
- [x] Organization settings optimistic updates
- [x] Form submissions with immediate feedback
- [x] Polling mechanism for data updates with configurable intervals
- [x] Reusable hooks for optimistic mutations
- [x] Specialized hooks for entity and related entity updates
- [x] Form integration with optimistic updates

With the optimistic UI updates completed, we are now moving on to:
1. Implementing metadata storage for user preferences and settings
2. Completing user and developer documentation
3. Enhancing error handling and fallback mechanisms for polling

## Technical Considerations

### Database Schema
- [x] Users table
- [x] Organizations table
- [x] Organization members table
- [x] Chat sessions table
- [x] Chat messages table
- [x] Function calls table
- [x] Integrations table
- [x] Tokens table
- [x] Prompts history table
- [x] Vector embeddings table (using pgvector)
- [x] Subscription and billing tables
- [x] Prompt templates table
- [x] Extensions table (planned)

### API Routes
- [x] Type-safe API routes with tRPC
- [x] Authentication endpoints
- [x] Organization management endpoints
- [x] Integration management endpoints
- [x] Prompt handling endpoints
- [x] User management endpoints
- [x] Billing and subscription endpoints
- [x] Prompt templates endpoints
- [x] Chat functionality
- [x] Function calling
- [x] Slack integration
  - [x] OAuth callback handler
  - [x] Bot event handling
  - [x] Slash commands
  - [x] Interactive components
  - [x] Template integration
- [ ] Edge functions for critical routes
- [x] Extension management (planned)

### Security Considerations
- [x] Secure token storage
- [x] API key encryption
- [x] Rate limiting with Upstash Rate Limit
- [x] CSRF protection
- [ ] Content Security Policy implementation
- [x] Input validation with Zod
- [ ] HTTPS enforcement with HSTS
- [x] Short-lived JWT tokens with refresh mechanism

### Performance Optimization
- [ ] React Server Components for improved performance
- [ ] Edge functions for global performance
- [x] TanStack Query for efficient data fetching and caching
- [x] Optimistic UI updates
- [x] Streaming responses for AI interactions
- [ ] Partial Prerendering for optimal loading strategies
- [ ] Core Web Vitals optimization

### Advanced AI Features
- [ ] Implement custom LLM providers
- [ ] Create advanced prompt engineering tools
- [ ] Set up AI model fine-tuning
- [ ] Implement AI-powered analytics
- [ ] Add support for multimodal AI models
- [ ] Create AI agent framework for autonomous tasks

### Enterprise Features
- [ ] Create team collaboration tools
- [ ] Implement advanced permissions
- [ ] Set up audit logging
- [ ] Create enterprise reporting

## Next Steps After MVP
1. Analytics dashboard with Posthog
2. Team collaboration features
3. Advanced prompt engineering tools
4. Custom integration builder
5. Expanded extension ecosystem
6. Enterprise features
7. Real-time updates with WebSockets or Server-Sent Events
8. Offline support with background sync
9. Enhanced data visualization with interactive dashboards
10. Mobile application with React Native
11. Advanced caching strategies for improved performance
12. AI workflow automation builder

## Development Timeline
- Phase 1: 2 weeks ✓
- Phase 2: 2 weeks (In progress - Implementing optimistic UI updates)
- Phase 3: 2 weeks ✓
- Phase 4: 2 weeks ✓
- Phase 5: 2 weeks ✓
- Phase 6: 2 weeks ✓
- Phase 7: 2 weeks ✓

Total MVP Development: Approximately 14 weeks 