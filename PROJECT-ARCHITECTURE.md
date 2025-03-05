# Nuco-App Architecture

This document provides a comprehensive overview of the Nuco-App architecture, explaining how all components fit together to create a cohesive application.

## System Overview

Nuco-App is a Next.js application that provides AI-powered integrations with various business tools. The application follows a modern architecture with the following key components:

1. **Frontend**: Next.js with App Router for server components and client components
2. **Backend**: API routes and tRPC procedures for type-safe API endpoints
3. **Database**: PostgreSQL with Drizzle ORM for data persistence
4. **Authentication**: NextAuth.js for multi-provider authentication
5. **AI Integration**: Vercel AI SDK for LLM integrations
6. **Payment Processing**: Stripe for subscription management
7. **External Integrations**: OAuth2 connections to business platforms

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Application                       │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │  UI Layer   │    │  API Layer  │    │  Integration Layer  │  │
│  │             │    │             │    │                     │  │
│  │ Components  │    │ API Routes  │    │ OAuth Providers     │  │
│  │ Pages       │◄──►│ tRPC Router │◄───┤ Webhook Handlers    │  │
│  │ Layouts     │    │ Middleware  │    │ External APIs       │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│          ▲                 ▲                     ▲              │
│          │                 │                     │              │
│          ▼                 ▼                     ▼              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ Auth Layer  │    │ Data Layer  │    │    Service Layer    │  │
│  │             │    │             │    │                     │  │
│  │ NextAuth.js │    │ Drizzle ORM │    │ Stripe Services     │  │
│  │ Session     │◄──►│ PostgreSQL  │◄───┤ AI Services         │  │
│  │ Providers   │    │ Migrations  │    │ Integration Services│  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. UI Layer

The UI layer is built using Next.js components, with a mix of server and client components:

- **Server Components**: Used for data fetching and rendering static content
- **Client Components**: Used for interactive elements and state management
- **Layouts**: Shared layouts for consistent UI across pages
- **Pages**: Route-specific page components
- **UI Components**: Reusable UI elements built with shadcn/ui and Tailwind CSS

### 2. API Layer

The API layer provides endpoints for client-server communication:

- **API Routes**: Next.js API routes for webhook handling and external integrations
- **tRPC Router**: Type-safe procedures for client-server communication
- **Middleware**: Request processing middleware for authentication and logging

### 3. Authentication Layer

The authentication layer manages user identity and access:

- **NextAuth.js**: Multi-provider authentication with session management
- **OAuth Providers**: Integration with external authentication providers
- **Session Management**: Secure session handling and persistence

### 4. Data Layer

The data layer manages data persistence and schema:

- **Drizzle ORM**: Type-safe ORM for database operations
- **PostgreSQL**: Relational database for data storage
- **Migrations**: Schema migration system for database changes

### 5. Service Layer

The service layer contains business logic and external service integrations:

- **Stripe Services**: Subscription and payment processing
- **AI Services**: LLM integration and prompt management
- **Integration Services**: External API integrations and data processing

### 6. Integration Layer

The integration layer connects with external services:

- **OAuth Providers**: Authentication with external services
- **Webhook Handlers**: Processing events from external services
- **External APIs**: Communication with third-party services

## Data Flow

1. **User Authentication**:
   - User authenticates via NextAuth.js
   - Session is created and stored
   - User is redirected to the dashboard

2. **API Requests**:
   - Client components make requests to tRPC procedures
   - tRPC router validates the request and session
   - Data is fetched or modified in the database
   - Response is returned to the client

3. **External Integrations**:
   - User authorizes connection to external service
   - OAuth flow is completed and tokens are stored
   - Application can now make requests to external APIs
   - Webhooks from external services are processed

4. **Subscription Management**:
   - User selects a subscription plan
   - Stripe checkout session is created
   - User completes payment on Stripe-hosted page
   - Webhook from Stripe updates subscription status
   - User gains access to subscribed features

## Key Design Patterns

1. **Repository Pattern**: Data access is abstracted through repository functions
2. **Service Pattern**: Business logic is encapsulated in service modules
3. **Middleware Pattern**: Request processing is handled by middleware chains
4. **Context Pattern**: Shared state is provided through React context
5. **Adapter Pattern**: External services are adapted to a common interface

## Deployment Architecture

The application is deployed on Vercel with the following components:

- **Next.js Application**: Deployed as serverless functions and static assets
- **PostgreSQL Database**: Hosted on a managed database service
- **Stripe Integration**: Connected to Stripe's production environment
- **External Services**: Connected to production instances of external APIs

## Security Considerations

1. **Authentication**: Secure authentication with NextAuth.js
2. **Authorization**: Role-based access control for organizations
3. **Data Protection**: Sensitive data is encrypted at rest
4. **API Security**: Rate limiting and input validation
5. **Payment Security**: Payment processing is handled by Stripe
6. **Webhook Verification**: Webhooks are verified using signatures

## Scalability Considerations

1. **Serverless Architecture**: Scales automatically with demand
2. **Database Connection Pooling**: Efficient database connection management
3. **Caching**: Strategic caching for frequently accessed data
4. **Optimistic Updates**: Improved user experience with optimistic UI updates
5. **Incremental Static Regeneration**: Efficient page rendering and caching

## Future Architecture Enhancements

1. **Microservices**: Split into domain-specific services
2. **Event-Driven Architecture**: Implement event bus for asynchronous processing
3. **GraphQL API**: Add GraphQL for more flexible data fetching
4. **Edge Functions**: Move critical functionality to edge locations
5. **Real-time Updates**: Implement WebSockets for real-time features

## Conclusion

The Nuco-App architecture is designed to be modular, scalable, and maintainable. By separating concerns into distinct layers and following modern design patterns, the application can evolve and grow while maintaining code quality and performance. 