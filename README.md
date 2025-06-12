## ⚙️ Configuration Options

### Dynamic Configuration with ConfigService

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    EventNotificationsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // Load event types from external file or database
        const eventTypes = await loadEventTypesFromFile('./config/event-types.ts');
        
        return {
          eventTypes,
          mode: configService.get('APP_MODE', 'hybrid') as 'api' | 'worker' | 'hybrid',
          
          providers: {
            email: {
              driver: 'smtp',
              config: {
                host: configService.get('SMTP_HOST'),
                port: configService.get('SMTP_PORT', 587),
                auth: {
                  user: configService.get('SMTP_USER'),
                  pass: configService.get('SMTP_PASS')
                }
              }
            },
            sms: configService.get('ENABLE_SMS') ? {
              driver: 'twilio',
              config: {
                accountSid: configService.get('TWILIO_SID'),
                authToken: configService.get('TWILIO_TOKEN'),
                fromNumber: configService.get('TWILIO_FROM')
              }
            } : undefined
          },
          
          queue: {
            redis: {
              host: configService.get('REDIS_HOST', 'localhost'),
              port: configService.get('REDIS_PORT', 6379),
              password: configService.get('REDIS_PASSWORD')
            },
            concurrency: configService.get('QUEUE_CONCURRENCY', 5),
            retryOptions: {
              attempts: configService.get('RETRY_ATTEMPTS', 3),
              delay: configService.get('RETRY_DELAY', 2000),
              backoff: configService.get('RETRY_BACKOFF', 'exponential')
            }
          },
          
          database: {
            autoSync: configService.get('DB_AUTO_SYNC', true),
            entities: ['dist/**/*.entity{.ts,.js}']
          },
          
          exposeManagementApi: configService.get('EXPOSE_MANAGEMENT_API', false),
          apiPrefix: configService.get('API_PREFIX', 'notifications')
        };
      }
    })
  ]
})
export class AppModule {}
```

### Error Handling & Retry Policies

```typescript
eventTypes: {
  'critical.alert': {
    description: 'Critical system alert',
    schema: { /* ... */ },
    retryPolicy: {
      attempts: 5,
      delay: 1000,
      backoff: 'exponential',
      maxDelay: 30000
    },
    priority: 'high'
  },
  'newsletter.send': {
    description: 'Newsletter distribution',
    schema: { /* ... */ },
    retryPolicy: {
      attempts: 2,
      delay: 5000,
      backoff: 'linear'
    },
    priority: 'low',
    rateLimiting: {
      windowMs: 60000, // 1 minute
      maxRequests: 10  // max 10 per minute per recipient
    }
  }
}
```

### Rate Limiting Configuration

```typescript
eventTypes: {
  'user.notification': {
    description: 'User notification',
    schema: { /* ... */ },
    rateLimiting: {
      windowMs: 60000,        // 1 minute window
      maxRequests: 5,         // max 5 notifications per minute
      skipSuccessfulRequests: false,
      keyGenerator: (payload) => `user:${payload.userId}` // custom rate limit key
    }
  }
}
```

## 📈 Monitoring & Observability

### Prometheus Metrics

The system automatically exposes Prometheus metrics:

```http
GET /notifications/metrics
```

**Available Metrics:**
- `events_emitted_total` - Total events emitted by type and mode
- `notifications_sent_total` - Total notifications sent by channel and status
- `event_processing_duration_seconds` - Event processing time histogram
- `queue_jobs_waiting` - Number of jobs waiting in queue
- `active_workers_count` - Number of active worker processes

### Health Checks

```http
GET /notifications/health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "queue": {
      "status": "healthy",
      "responseTime": 2,
      "details": {
        "waiting": 0,
        "active": 2,
        "completed": 1543,
        "failed": 3
      }
    },
    "providers": {
      "email-smtp": {
        "status": "healthy",
        "responseTime": 150
      },
      "sms-twilio": {
        "status": "healthy",
        "responseTime": 89
      }
    }
  },
  "uptime": 86400000
}
```

### Structured Logging

All operations include structured logging with correlation IDs:

```typescript
// Automatic correlation ID tracking
const result = await eventEmitter.emit('user.created', payload, {
  correlationId: 'req-123-456-789'
});

// Logs will include:
// [EventEmitter] [req-123-456-789] Processing event user.created
// [NotificationProcessor] [req-123-456-789] Sending email to user@example.com
// [SmtpProvider] [req-123-456-789] Email sent successfully, messageId: <abc123>
```

### Grafana Dashboard

Example Grafana queries for monitoring:

```promql
# Event emission rate
rate(events_emitted_total[5m])

# Notification success rate
rate(notifications_sent_total{status="sent"}[5m]) / rate(notifications_sent_total[5m]) * 100

# Queue depth over time
queue_jobs_waiting

# P95 processing time
histogram_quantile(0.95, rate(event_processing_duration_seconds_bucket[5m]))

# Failed notifications by channel
rate(notifications_sent_total{status="failed"}[5m]) by (channel)
```

## 🔧 Environment Variables

```env
# Application Configuration
NODE_ENV=production
APP_MODE=hybrid                    # api | worker | hybrid

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=notifications
DB_PASSWORD=secure_password
DB_DATABASE=event_notifications
DB_AUTO_SYNC=false                 # true for development only

# Redis Configuration (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Email Provider (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@company.com
SMTP_PASS=app_specific_password

# SMS Provider (Twilio)
TWILIO_SID=AC1234567890abcdef
TWILIO_TOKEN=your_auth_token
TWILIO_FROM=+1234567890

# Push Notifications (Firebase)
FIREBASE_SERVER_KEY=your_server_key
FIREBASE_SENDER_ID=123456789

# External Service Integration
EXTERNAL_SERVICE_URL=https://api.external-service.com
EXTERNAL_SERVICE_KEY=your_api_key

# Webhook Configuration
WEBHOOK_TIMEOUT=30000
WEBHOOK_RETRIES=3
WEBHOOK_TOKEN=secure_webhook_token

# Feature Flags
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_WEBHOOK_NOTIFICATIONS=true
ENABLE_EXTERNAL_SERVICE_NOTIFICATIONS=true

# Performance Settings
QUEUE_CONCURRENCY=10
NOTIFICATION_BATCH_SIZE=100
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Monitoring & API
EXPOSE_MANAGEMENT_API=true
API_PREFIX=notifications
ENABLE_METRICS=true
METRICS_PREFIX=event_notifications

# Security
API_KEY_HEADER=x-api-key
VALID_API_KEYS=key1,key2,key3
CORS_ORIGINS=https://admin.company.com,https://dashboard.company.com
```

## 🚀 Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/
COPY config/ ./config/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/notifications/health || exit 1

# Start application
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  notifications-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - APP_MODE=api
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  notifications-worker:
    build: .
    environment:
      - NODE_ENV=production
      - APP_MODE=worker
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: event_notifications
      POSTGRES_USER: notifications
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notifications-api
  template:
    metadata:
      labels:
        app: notifications-api
    spec:
      containers:
      - name: api
        image: your-registry/notifications:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: APP_MODE
          value: "api"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis-host
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /notifications/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /notifications/health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notifications-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: notifications-worker
  template:
    metadata:
      labels:
        app: notifications-worker
    spec:
      containers:
      - name: worker
        image: your-registry/notifications:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: APP_MODE
          value: "worker"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

## 🧪 Testing

### Unit Testing

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { UserService } from './user.service';

describe('UserService', () => {
  let userService: UserService;
  let eventEmitter: jest.Mocked<EventEmitterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: EventEmitterService,
          useValue: {
            emit: jest.fn(),
            emitSync: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    eventEmitter = module.get(EventEmitterService);
  });

  it('should emit user.created event when creating user', async () => {
    const userData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockUser = { id: 1, ...userData };
    jest.spyOn(userService['userRepository'], 'save').mockResolvedValue(mockUser);

    await userService.createUser(userData);

    expect(eventEmitter.emit).toHaveBeenCalledWith('user.created', {
      userId: 1,
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    });
  });
});
```

### Integration Testing

```typescript
// notifications.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventNotificationsModule, EventEmitterService } from '@afidos/nestjs-event-notifications';

describe('Notifications Integration', () => {
  let app: INestApplication;
  let eventEmitter: EventEmitterService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: ['src/**/*.entity{.ts,.js}'],
        }),
        EventNotificationsModule.forRoot({
          eventTypes: {
            'test.event': {
              description: 'Test event',
              schema: {
                userId: { type: 'number', required: true },
                message: { type: 'string', required: true },
              },
              defaultProcessing: 'sync',
              waitForResult: true,
              channels: ['email'],
              priority: 'normal',
            },
          },
          mode: 'api',
          providers: {
            email: {
              driver: 'mock',
              config: {},
            },
          },
          queue: {
            redis: {
              host: 'localhost',
              port: 6379,
            },
            concurrency: 1,
            retryOptions: {
              attempts: 1,
              delay: 1000,
            },
          },
          database: {
            autoSync: true,
            entities: ['**/*.entity{.ts,.js}'],
          },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventEmitter = app.get<EventEmitterService>(EventEmitterService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should process events end-to-end', async () => {
    const result = await eventEmitter.emit('test.event', {
      userId: 123,
      message: 'Test message',
    });

    expect(result.eventId).toBeDefined();
    expect(result.correlationId).toBeDefined();
    expect(result.mode).toBe('sync');
    expect(result.waitedForResult).toBe(true);
  });
});
```

### E2E Testing

```typescript
// notifications.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Notifications API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/notifications/emit (POST)', () => {
    return request(app.getHttpServer())
      .post('/notifications/emit')
      .send({
        eventType: 'test.event',
        payload: { userId: 1, message: 'test' },
        options: { waitForResult: true },
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.eventId).toBeDefined();
        expect(res.body.correlationId).toBeDefined();
      });
  });

  it('/notifications/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/notifications/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBeDefined();
        expect(res.body.checks).toBeDefined();
      });
  });
});
```

## 🔍 Performance Optimization

### Database Optimization

```sql
-- Recommended indexes for PostgreSQL
CREATE INDEX CONCURRENTLY idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX CONCURRENTLY idx_event_logs_status ON event_logs(status);
CREATE INDEX CONCURRENTLY idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX CONCURRENTLY idx_event_logs_correlation_id ON event_logs(correlation_id);
CREATE INDEX CONCURRENTLY idx_event_recipients_event_type ON event_recipients(event_type_name);
CREATE INDEX CONCURRENTLY idx_event_recipients_enabled ON event_recipients(enabled) WHERE enabled = true;

-- Partitioning for large tables
CREATE TABLE event_logs_y2024m01 PARTITION OF event_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Memory Optimization

```typescript
// Streaming for large datasets
@Get('logs/export')
async exportLogs(@Res() response: Response) {
  const stream = this.eventLogRepository
    .createQueryBuilder('log')
    .where('log.createdAt > :date', { 
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
    })
    .stream();

  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Content-Disposition', 'attachment; filename=logs.json');

  stream.pipe(response);
}
```

### Caching Strategy

```typescript
// Cache frequently accessed data
@Injectable()
export class EventTypeService {
  private cache = new Map<string, EventType>();

  async getEventType(name: string): Promise<EventType> {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    const eventType = await this.eventTypeRepository.findOne({
      where: { name, enabled: true }
    });

    if (eventType) {
      this.cache.set(name, eventType);
      // Cache for 5 minutes
      setTimeout(() => this.cache.delete(name), 5 * 60 * 1000);
    }

    return eventType;
  }
}
```

## 📚 Migration Guide

### From v0.x to v1.x

See [MIGRATION.md](./MIGRATION.md) for detailed migration instructions including:

- Configuration format changes
- Breaking API changes
- Database schema updates
- Type definition updates
- Provider registration changes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/afidos/nestjs-event-notifications.git
cd nestjs-event-notifications

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development dependencies
docker-compose up -d postgres redis

# Run tests
npm test

# Start development server
npm run start:dev
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://afidos.github.io/nestjs-event-notifications)
- 🐛 [Issue Tracker](https://github.com/afidos/nestjs-event-notifications/issues)
- 💬 [Discussions](https://github.com/afidos/nestjs-event-notifications/discussions)
- 📧 [Email Support](mailto:support@afidos.com)

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- BullMQ team for the reliable queue system
- TypeORM team for the excellent ORM
- All contributors and users of this package

---

**Made with ❤️ by [Afidos](https://afidos.com)**# @afidos/nestjs-event-notifications

🚀 **Enterprise-grade event and notification system for NestJS applications**

[![npm version](https://badge.fury.io/js/@afidos%2Fnestjs-event-notifications.svg)](https://badge.fury.io/js/@afidos%2Fnestjs-event-notifications)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)

## ✨ Features

- 🎯 **Type-safe** event emission with auto-generated TypeScript types
- 📨 **Multi-channel** notifications (Email, SMS, Push, Webhook, External Services, Real-time)
- ⚡ **Hybrid processing** modes (API, Worker, Hybrid) with smart routing
- 🔄 **Advanced retry** policies with exponential/linear backoff
- 📊 **Built-in monitoring** with Prometheus metrics and health checks
- 🎨 **Template system** with Handlebars rendering and localization
- 🔒 **Production-ready** with circuit breakers, rate limiting, and error handling
- 🛠️ **CLI tools** for maintenance, testing, and type generation
- 📈 **Scalable** architecture with Redis-based queuing (BullMQ)
- 🔧 **Highly configurable** with extensive customization options

## 🚀 Quick Start

### Installation

```bash
npm install @afidos/nestjs-event-notifications

# Peer dependencies
npm install @nestjs/typeorm @nestjs/bullmq @nestjs/config @nestjs/event-emitter
npm install typeorm bullmq ioredis class-validator class-transformer
```

### Basic Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { EventNotificationsModule } from '@afidos/nestjs-event-notifications';

@Module({
  imports: [
    EventNotificationsModule.forRoot({
      eventTypes: {
        'user.created': {
          description: 'User account created',
          schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            firstName: { type: 'string', required: true },
            lastName: { type: 'string', required: true }
          },
          defaultProcessing: 'async',
          waitForResult: false,
          channels: ['email'],
          priority: 'normal',
          templates: {
            email: 'user-welcome-template'
          }
        },
        'order.payment.completed': {
          description: 'Payment completed successfully',
          schema: {
            orderId: { type: 'string', required: true },
            amount: { type: 'number', required: true },
            customerId: { type: 'number', required: true },
            paymentMethod: { type: 'string', required: true }
          },
          defaultProcessing: 'sync',
          waitForResult: true,
          channels: ['email', 'sms', 'webhook'],
          priority: 'high',
          retryPolicy: {
            attempts: 5,
            delay: 1000,
            backoff: 'exponential'
          }
        }
      },
      mode: 'hybrid', // 'api' | 'worker' | 'hybrid'
      providers: {
        email: {
          driver: 'smtp',
          config: {
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          }
        },
        sms: {
          driver: 'twilio',
          config: {
            accountSid: process.env.TWILIO_SID,
            authToken: process.env.TWILIO_TOKEN,
            fromNumber: process.env.TWILIO_FROM
          }
        },
        webhook: {
          driver: 'http',
          config: {
            timeout: 30000,
            retries: 3
          }
        }
      },
      queue: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD
        },
        concurrency: 5,
        retryOptions: {
          attempts: 3,
          delay: 2000,
          backoff: 'exponential'
        }
      },
      database: {
        autoSync: true,
        entities: ['dist/**/*.entity{.ts,.js}']
      },
      exposeManagementApi: true,
      apiPrefix: 'notifications'
    })
  ]
})
export class AppModule {}
```

### Type-Safe Usage

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';

@Injectable()
export class UserService {
  constructor(private eventEmitter: EventEmitterService) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(userData);
    
    // ✨ Type-safe event emission - TypeScript validates payload automatically
    await this.eventEmitter.emit('user.created', {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
      // ❌ TypeScript will error if you miss required fields or use wrong types
    });
    
    return user;
  }
}
```

## 🎯 Advanced Usage

### Auto-Generated Type Safety

Generate TypeScript types from your event configuration:

```bash
# Generate TypeScript types
npx nest-commander generate-event-types --output ./types/events.ts --examples --validation

# Generate JSON Schema
npx nest-commander generate-event-types --format json-schema --output ./schemas/events.json

# Generate OpenAPI Schema
npx nest-commander generate-event-types --format openapi --output ./api/events.openapi.json
```

```typescript
// types/events.ts (auto-generated)
export interface UserCreatedPayload {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
}

export type EventTypeNames = 'user.created' | 'order.payment.completed';

export interface TypeSafeEventEmitter {
  emit<T extends EventTypeNames>(
    eventType: T,
    payload: EventPayloadMapping[T],
    options?: EmitOptions
  ): Promise<EventEmissionResult>;
}

// Utility functions
export function supportsChannel(eventType: EventTypeNames, channel: string): boolean;
export function getEventChannels(eventType: EventTypeNames): string[];
export function validatePayloadStructure(eventType: EventTypeNames, payload: any): boolean;
```

### Decorators for Auto-Emission

```typescript
import { EmitEvent } from '@afidos/nestjs-event-notifications';

@Injectable()
export class OrderService {
  constructor(private eventEmitter: EventEmitterService) {}

  @EmitEvent({
    eventType: 'order.created',
    mode: 'async',
    payloadTransform: (order, createOrderDto) => ({
      orderId: order.id,
      customerId: order.customerId,
      totalAmount: order.total,
      items: order.items.map(item => ({ 
        productId: item.productId, 
        quantity: item.quantity 
      }))
    })
  })
  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    return await this.orderRepository.save(createOrderDto);
    // Event automatically emitted after successful execution
  }
}
```

### Waiting for Results & Error Handling

```typescript
@Injectable()
export class PaymentService {
  constructor(private eventEmitter: EventEmitterService) {}

  async processPayment(paymentData: ProcessPaymentDto): Promise<PaymentResult> {
    try {
      const payment = await this.processPaymentLogic(paymentData);
      
      // Emit event and wait for all notifications to be sent
      const result = await this.eventEmitter.emit('order.payment.completed', {
        orderId: payment.orderId,
        amount: payment.amount,
        customerId: payment.customerId,
        paymentMethod: payment.method
      }, {
        waitForResult: true,
        timeout: 30000,
        mode: 'sync'
      });

      // Check if all notifications were successful
      const allSent = result.results?.every(r => r.status === 'sent');
      const failedChannels = result.results?.filter(r => r.status === 'failed').map(r => r.channel);
      
      return {
        success: true,
        notificationsSent: allSent,
        failedChannels,
        correlationId: result.correlationId
      };
    } catch (error) {
      // Emit failure event
      await this.eventEmitter.emitAsync('payment.failed', {
        orderId: paymentData.orderId,
        error: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }
}
```

### Custom Notification Providers

Create your own notification providers for any service:

```typescript
// slack.provider.ts
import { Injectable } from '@nestjs/common';
import { NotificationProvider, RecipientConfig, NotificationResult } from '@afidos/nestjs-event-notifications';

@Injectable()
export class SlackProvider implements NotificationProvider {
  readonly name = 'slack';
  readonly channel = 'webhook' as any;

  constructor(private config: { webhookUrl: string; botToken: string }) {}

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    try {
      const slackMessage = {
        channel: recipient.recipientId,
        text: payload.message || JSON.stringify(payload),
        attachments: payload.attachments || [],
        username: 'NotificationBot',
        icon_emoji: ':bell:'
      };

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      if (response.ok) {
        return {
          channel: this.channel,
          status: 'sent',
          externalId: `slack-${Date.now()}`,
          timestamp: new Date()
        };
      }

      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    } catch (error) {
      return {
        channel: this.channel,
        status: 'failed',
        message: error.message,
        timestamp: new Date()
      };
    }
  }

  validateConfig(config: any): boolean {
    return !!(config.webhookUrl && config.botToken);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.config.webhookUrl, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Register in module
@Module({
  imports: [
    EventNotificationsModule.forRoot({
      // ... other config
      customProviders: [
        {
          provide: 'SLACK_PROVIDER',
          useFactory: () => new SlackProvider({
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            botToken: process.env.SLACK_BOT_TOKEN
          })
        }
      ]
    })
  ]
})
export class AppModule {}
```

## 🏗️ Architecture Modes

### API Mode (`mode: 'api'`)
All notifications processed synchronously within request lifecycle. Best for low-volume applications.

```typescript
EventNotificationsModule.forRoot({
  mode: 'api',
  // Notifications processed immediately in HTTP request
})
```

### Worker Mode (`mode: 'worker'`)
All notifications queued and processed by background workers. Best for high-volume applications.

```typescript
EventNotificationsModule.forRoot({
  mode: 'worker',
  // All notifications queued for background processing
})
```

### Hybrid Mode (`mode: 'hybrid'`) - **Recommended**
Smart routing: critical notifications processed synchronously, others queued.

```typescript
EventNotificationsModule.forRoot({
  mode: 'hybrid',
  // High priority events processed immediately
  // Normal/low priority events queued for background processing
})
```

## 📡 Supported Notification Channels

### Email (SMTP)

```typescript
providers: {
  email: {
    driver: 'smtp',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // Optional: custom templates
      templates: {
        welcome: {
          subject: 'Welcome {{name}}!',
          html: '<h1>Welcome {{name}}</h1><p>Thanks for joining us!</p>'
        }
      }
    }
  }
}
```

### SMS (Twilio)

```typescript
providers: {
  sms: {
    driver: 'twilio',
    config: {
      accountSid: process.env.TWILIO_SID,
      authToken: process.env.TWILIO_TOKEN,
      fromNumber: '+1234567890'
    }
  }
}
```

### Push Notifications (Firebase)

```typescript
providers: {
  push: {
    driver: 'firebase',
    config: {
      serverKey: process.env.FIREBASE_SERVER_KEY,
      senderId: process.env.FIREBASE_SENDER_ID
    }
  }
}
```

### Webhooks

```typescript
providers: {
  webhook: {
    driver: 'http',
    config: {
      timeout: 30000,
      retries: 3,
      headers: {
        'Authorization': 'Bearer ' + process.env.WEBHOOK_TOKEN
      }
    }
  }
}
```

### External Services

```typescript
providers: {
  externalService: {
    driver: 'firebase-like',
    config: {
      apiKey: process.env.EXTERNAL_API_KEY,
      endpoint: 'https://api.external-service.com',
      projectId: 'your-project-id'
    }
  }
}
```

## 🛠️ CLI Commands

### Sync Event Types with Database

```bash
npx nest-commander sync-event-types
```

### Generate TypeScript Types

```bash
# Basic generation
npx nest-commander generate-event-types

# With examples and validation classes
npx nest-commander generate-event-types \
  --output ./types/events.ts \
  --examples \
  --validation \
  --force

# Generate JSON Schema
npx nest-commander generate-event-types \
  --format json-schema \
  --output ./schemas/events.schema.json

# Generate OpenAPI specification
npx nest-commander generate-event-types \
  --format openapi \
  --output ./api/events.openapi.json
```

### Test Notification Configuration

```bash
# Test all providers
npx nest-commander test-notification-config

# Test specific provider
npx nest-commander test-notification-config --provider email

# Test with verbose output
npx nest-commander test-notification-config --provider sms --verbose
```

### Database Migration

```bash
# Migrate from previous version
npx nest-commander migrate-notifications --from-version 0.9.0

# Dry run to see what would be migrated
npx nest-commander migrate-notifications --from-version 0.9.0 --dry-run
```

### Cleanup Old Logs

```bash
# Clean logs older than 30 days (default)
npx nest-commander cleanup-logs

# Clean logs older than 7 days in batches of 500
npx nest-commander cleanup-logs --days 7 --batch-size 500

# Dry run to see what would be deleted
npx nest-commander cleanup-logs --days 30 --dry-run
```

## 📊 Management API

When `exposeManagementApi: true`, REST endpoints are available:

### Event Types Management

```http
GET    /notifications/event-types
POST   /notifications/event-types
PUT    /notifications/event-types/:id
DELETE /notifications/event-types/:id
```

### Recipients Management

```http
GET    /notifications/recipients
POST   /notifications/recipients
PUT    /notifications/recipients/:id
DELETE /notifications/recipients/:id

# Bulk operations
POST   /notifications/recipients/bulk
GET    /notifications/recipients/by-event/:eventType
```

### Monitoring & Analytics

```http
GET    /notifications/logs?eventType=user.created&status=sent&limit=100
GET    /notifications/stats?period=7d
GET    /notifications/health
GET    /notifications/metrics
```

### Testing & Operations

```http
POST   /notifications/test/:channel
POST   /notifications/emit
POST   /notifications/retry/:logId
```

### Example API Usage

```bash
# Create event recipient
curl -X POST http://localhost:3000/notifications/recipients \
  -H "Content-Type: application/json" \
  -d '{
    "eventTypeName": "user.created",
    "channel": "email",
    "recipientType": "email",
    "recipientId": "user@example.com",
    "config": {
      "template": "welcome-email",
      "language": "en"
    }
  }'

# Test email provider
curl -X POST http://localhost:3000/notifications/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "payload": {
      "subject": "Test Email",
      "message": "This is a test notification",
      "name": "John Doe"
    }
  }'

# Get notification statistics
curl "http://localhost:3000/notifications/stats?period=7d" | jq

# Emit event via API
curl -X POST http://localhost:3000/notifications/emit \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "user.created",
    "payload": {
      "userId": 123,
      "email": "newuser@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "options": {
      "waitForResult": true,
      "timeout": 30000
    }
  }'
```

## Dynamic Configuration

### Async Configuration with ConfigService
```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule.forRoot(),
        EventNotificationsModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const eventTypes = await loadEventTypesFromFile('./config/event-types.ts');

                return {
                    eventTypes,
                    mode: configService.get('APP_MODE', 'hybrid'),
                    providers: {
                        email: {
                            driver: 'smtp',
                            config: {
                                host: configService.get('SMTP_HOST'),
                                port: configService.get('SMTP_PORT', 587),
                                auth: {
                                    user: configService.get('SMTP_USER'),
                                    pass: configService.get('SMTP_PASS')
                                }
                            }
                        }
                    },
                    queue: {
                        redis: {
                            host: configService.get('REDIS_HOST', 'localhost'),
                            port: configService.get('REDIS_PORT', 6379),
                            password: configService.get('REDIS_PASSWORD')
                        },
                        concurrency: configService.get('QUEUE_CONCURRENCY', 5),
                        retryOptions: {
                            attempts: configService.get('RETRY_ATTEMPTS', 3),
                            delay: configService.get('RETRY_DELAY', 2000)
                        }
                    },
                    database: {
                        autoSync: configService.get('DB_AUTO_SYNC', true),
                        entities: ['dist/**/*.entity{.ts,.js}']
                    }
                };
            }
        })
    ]
})
export class AppModule {}
```

## Management API

When `exposeManagementApi: true` is set, the following REST endpoints are available:

### Event Types Management
```http
GET    /notifications/event-types
POST   /notifications/event-types
PUT    /notifications/event-types/:id
DELETE /notifications/event-types/:id
```

### Recipients Management
```http
GET    /notifications/recipients
POST   /notifications/recipients
PUT    /notifications/recipients/:id
DELETE /notifications/recipients/:id
```

### Monitoring & Testing
```http
GET    /notifications/logs?eventType=user.welcome&status=sent
GET    /notifications/stats
POST   /notifications/test/:channel
POST   /notifications/emit
POST   /notifications/retry/:logId
```

### Example API Usage
```bash
# Create event recipient
curl -X POST http://localhost:3000/notifications/recipients \
  -H "Content-Type: application/json" \
  -d '{
    "eventTypeName": "user.welcome",
    "channel": "email",
    "recipientType": "email",
    "recipientId": "user@example.com",
    "config": {
      "template": "welcome-email",
      "language": "en"
    }
  }'

# Test email notification
curl -X POST http://localhost:3000/notifications/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "payload": {
      "subject": "Test Email",
      "message": "This is a test notification"
    }
  }'

# Get notification statistics
curl http://localhost:3000/notifications/stats?period=7d
```

## CLI Commands

The package includes useful CLI commands for maintenance:

```bash
# Synchronize event types from configuration to database
npx nest-commander sync-event-types

# Generate TypeScript type definitions
npx nest-commander generate-event-types --output ./types/events.ts

# Test notification configuration
npx nest-commander test-notification-config --provider email

# Migrate existing notifications
npx nest-commander migrate-notifications --from-version 0.9.0
```

## Environment Variables

```env
# Application Mode
APP_MODE=hybrid # api | worker | hybrid

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Email Provider (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS Provider (Twilio)
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_FROM=+1234567890

# Webhook Configuration
WEBHOOK_TIMEOUT=30000
WEBHOOK_RETRIES=3

# External Service
EXTERNAL_SERVICE_URL=https://api.external-service.com
EXTERNAL_SERVICE_KEY=your_api_key

# Feature Flags
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_WEBHOOK_NOTIFICATIONS=true
ENABLE_PUSH_NOTIFICATIONS=true

# Performance Tuning
NOTIFICATION_WORKER_CONCURRENCY=5
NOTIFICATION_BATCH_SIZE=100
NOTIFICATION_RATE_LIMIT_PER_MINUTE=1000
```

## Architecture Modes

### API Mode (`mode: 'api'`)
All notifications are processed synchronously within the API request lifecycle. Best for low-volume applications.

### Worker Mode (`mode: 'worker'`)
All notifications are queued and processed by background workers. Best for high-volume applications.

### Hybrid Mode (`mode: 'hybrid'`) - Recommended
Combines both approaches - critical notifications processed synchronously, others queued for background processing.

## Error Handling & Retry Policies

```typescript
// Custom retry policy per event type
{
    eventTypes: {
        'critical.alert': {
            // ... other config
            retryPolicy: {
                attempts: 5,
                    delay: 1000,
                    backoff: 'exponential',
                    maxDelay: 30000
            }
        },
        'newsletter.send': {
            // ... other config
            retryPolicy: {
                attempts: 2,
                    delay: 5000,
                    backoff: 'linear'
            }
        }
    }
}
```

## Rate Limiting

```typescript
// Rate limiting configuration
{
    eventTypes: {
        'user.notification': {
            // ... other config
            rateLimiting: {
                windowMs: 60000, // 1 minute
                    maxRequests: 10, // max 10 notifications per minute per user
                    skipSuccessfulRequests: false
            }
        }
    }
}
```

## Monitoring & Metrics

The package provides built-in monitoring capabilities:

- **Event emission metrics** (count, success rate, latency)
- **Queue metrics** (pending jobs, completed, failed)
- **Provider health checks** (availability, response time)
- **Real-time dashboard** (when management API is enabled)

## Type Safety

The package automatically generates TypeScript types based on your event configuration:

```typescript
// Auto-generated types based on your eventTypes configuration
type UserWelcomePayload = {
    userId: number;
    email: string;
    name: string;
};

type OrderPaymentCompletedPayload = {
    orderId: string;
    amount: number;
    customerId: number;
    paymentMethod: string;
};

// These types are automatically inferred and validated
await eventEmitter.emit('user.welcome', {
    userId: 123,
    email: 'user@example.com',
    name: 'John Doe'
    // TypeScript will show error if any required field is missing
});
```

## Testing

```typescript
// Example test setup
import { Test } from '@nestjs/testing';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';

describe('UserService', () => {
    let userService: UserService;
    let eventEmitter: EventEmitterService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            imports: [
                EventNotificationsModule.forRoot({
                    // Test configuration
                    mode: 'api', // Synchronous for testing
                    eventTypes: {
                        'user.welcome': {
                            description: 'Test event',
                            schema: {
                                userId: { type: 'number', required: true },
                                email: { type: 'string', required: true }
                            },
                            defaultProcessing: 'sync',
                            waitForResult: true,
                            channels: ['email']
                        }
                    },
                    providers: {
                        email: {
                            driver: 'mock', // Use mock provider for testing
                            config: {}
                        }
                    }
                })
            ],
            providers: [UserService]
        }).compile();

        userService = module.get<UserService>(UserService);
        eventEmitter = module.get<EventEmitterService>(EventEmitterService);
    });

    it('should emit user.welcome event when creating user', async () => {
        const emitSpy = jest.spyOn(eventEmitter, 'emit');

        await userService.createUser({
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe'
        });

        expect(emitSpy).toHaveBeenCalledWith('user.welcome', {
            userId: expect.any(Number),
            email: 'test@example.com',
            name: 'John Doe'
        });
    });
});
```

## Migration Guide

### From v0.x to v1.x

1. **Configuration Changes**: Event types are now defined in the module configuration instead of decorators
2. **Provider Registration**: Custom providers are registered differently
3. **Type Safety**: Payload types are now auto-generated from configuration

See [MIGRATION.md](./MIGRATION.md) for detailed migration steps.

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

MIT License. See [LICENSE](./LICENSE) for details.

## Support

- 📖 [Documentation](https://afidos.github.io/nestjs-event-notifications)
- 🐛 [Issue Tracker](https://github.com/afidos/nestjs-event-notifications/issues)
- 💬 [Discussions](https://github.com/afidos/nestjs-event-notifications/discussions)
- 📧 [Email Support](mailto:fiacre.ayedoun@gmail.com)
