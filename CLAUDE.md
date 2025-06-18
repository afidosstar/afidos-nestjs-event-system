# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build & Development
- `npm run build` - Build the project (cleans first)
- `npm run build:watch` - Build in watch mode
- `npm run start:dev` - Run in development mode with ts-node
- `npm run clean` - Clean dist, coverage, and .nyc_output directories

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:ci` - Run tests in CI mode with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:debug` - Run tests in debug mode

### Code Quality
- `npm run lint` - Run ESLint and fix issues
- `npm run lint:check` - Run ESLint without fixing
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

### Workers & CLI
- `npm run worker` - Start notification worker (production)
- `npm run worker:dev` - Start worker in development mode
- `npm run cli:sync` - Sync event types configuration to database

### Example Development (replaces yalc)

#### Basic Usage Example
- `npm run example:install` - Install all dependencies (root + examples)
- `npm run example:dev` - Build library and start example in dev mode
- `npm run example:start` - Start example application
- `npm run example:start:dev` - Start example in watch mode
- `npm run example:test` - Run tests in example project

#### Advanced Usage Example
- `npm run example:advanced:install` - Install advanced example dependencies
- `npm run example:advanced:dev` - Build and start advanced example in hybrid mode
- `npm run example:advanced:api` - Start in API-only mode
- `npm run example:advanced:worker` - Start in worker-only mode
- `npm run example:advanced:monitoring` - Start in monitoring-only mode

## Architecture Overview

This is an **enterprise-grade event and notification system for NestJS applications** (`@afidos/nestjs-event-notifications`). The system provides a modular, provider-based architecture for handling events and notifications across multiple channels.

### Core Components

#### 1. Module Structure
- **EventNotificationsModule** - Main module with three configuration modes:
  - `forRoot()` - Full configuration with API and workers
  - `forApi()` - API-only mode (no workers)
  - `forWorker()` - Worker-only mode for dedicated worker instances

#### 2. Core Services
- **EventEmitterService** - Main service for emitting events
- **EventRoutingService** - Routes events to appropriate notification providers
- **QueueService** - Handles async event processing with Bull/Redis
- **RetryService** - Manages retry logic for failed notifications

#### 3. Provider Architecture
The system uses a pluggable provider architecture supporting:
- **SmtpEmailProvider** - Email notifications via SMTP
- **HttpWebhookProvider** - HTTP webhook notifications
- **ExternalServiceProvider** - Firebase-like external service integration

#### 4. Database Entities
- **EventTypeEntity** - Stores event type configurations
- **EventLogEntity** - Logs all event emissions
- **NotificationResultEntity** - Stores notification results
- **ProviderHealthEntity** - Tracks provider health status
- **EventStatsEntity** - Stores event statistics

### Configuration Pattern

The system uses a type-safe configuration pattern:

```typescript
// Event types definition
interface MyEventPayloads extends EventPayloads {
  'user.welcome': { userId: number; email: string; };
  'order.created': { orderId: string; amount: number; };
}

// Configuration
const config = createPackageConfig<MyEventPayloads>({
  eventTypes: {
    'user.welcome': {
      description: 'Welcome email for new users',
      channels: ['email'],
      defaultProcessing: 'async'
    }
  },
  providers: {
    email: {
      driver: 'smtp',
      config: { /* SMTP config */ }
    }
  }
});
```

### Processing Modes
- **Sync** - Immediate processing, waits for result
- **Async** - Queue-based processing using Bull/Redis

### Key Features
- Type-safe event payloads
- Multiple notification channels (email, webhook, external services)
- Retry mechanisms with configurable policies
- Health monitoring and statistics
- CLI tools for configuration management
- Scalable worker architecture

### Dependencies
- NestJS framework (peer dependency)
- TypeORM for database operations
- Bull for queue management
- Redis for queue storage
- Optional: nodemailer for SMTP

### Examples

#### Basic Usage (`examples/basic-usage/`)
- Simple NestJS application with user and order management
- Demonstrates basic event types (user.welcome, order.created, etc.)
- Uses standard providers (SMTP, HTTP webhook)
- SQLite database and basic configuration
- Ideal for learning and simple implementations

#### Advanced Usage (`examples/advanced-usage/`)
- **Enterprise-grade implementation** with multiple deployment modes
- **Custom providers**: Slack, Discord, Microsoft Teams
- **Multi-mode architecture**: API-only, Worker-only, Monitoring-only, Hybrid
- **Prometheus metrics** and monitoring dashboard
- **Complex event workflows** with priorities and custom payloads
- **Advanced configuration** with environment-based setup
- **Production-ready patterns** with health checks and graceful shutdown

### Development Notes
- Uses TypeScript with decorators enabled
- French comments in some files (legacy code)
- Strict TypeScript disabled for flexibility
- Uses path aliases (`@/*` maps to `src/*`)
- **Local Development**: Uses npm workspaces instead of yalc for linking the library to examples
- The main package.json includes `workspaces: ["examples/*"]` for automatic dependency linking