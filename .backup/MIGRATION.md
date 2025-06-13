# MIGRATION.md

## Migration Guide

### From v0.x to v1.x

This guide will help you migrate from the old decorator-based approach to the new configuration-based system.

#### Major Changes

1. **Event Types Configuration**: Event types are now defined in module configuration instead of decorators
2. **Type Safety**: Automatic TypeScript type generation from configuration
3. **Provider Registration**: New provider registration system
4. **Database Schema**: Updated entity structure

#### Step-by-Step Migration

##### 1. Update Package Version

```bash
npm install @afidos/nestjs-event-notifications@^1.0.0
```

##### 2. Migrate Event Type Definitions

**Before (v0.x):**
```typescript
@EventType('user.created', {
  description: 'User created event',
  channels: ['email'],
})
export class UserCreatedEvent {
  @EventField('number', true)
  userId: number;

  @EventField('string', true)
  email: string;
}
```

**After (v1.x):**
```typescript
// In your module configuration
const eventTypesConfig = {
  'user.created': {
    description: 'User created event',
    schema: {
      userId: { type: 'number', required: true },
      email: { type: 'string', required: true }
    },
    defaultProcessing: 'async',
    waitForResult: false,
    channels: ['email'],
    priority: 'normal'
  }
};
```

##### 3. Update Module Configuration

**Before (v0.x):**
```typescript
@Module({
  imports: [
    EventNotificationsModule.forRoot({
      providers: {
        email: { /* config */ }
      }
    })
  ]
})
```

**After (v1.x):**
```typescript
@Module({
  imports: [
    EventNotificationsModule.forRoot({
      eventTypes: eventTypesConfig,
      mode: 'hybrid',
      providers: {
        email: { /* config */ }
      },
      queue: { /* queue config */ },
      database: { /* db config */ }
    })
  ]
})
```

##### 4. Update Event Emission

**Before (v0.x):**
```typescript
await this.eventEmitter.emit(new UserCreatedEvent(user.id, user.email));
```

**After (v1.x):**
```typescript
await this.eventEmitter.emit('user.created', {
  userId: user.id,
  email: user.email
});
```

##### 5. Database Migration

Run the migration command to update your database schema:

```bash
npx nest-commander migrate-notifications --from-version 0.9.0
```

##### 6. Generate Types

Generate TypeScript types from your new configuration:

```bash
npx nest-commander generate-event-types --output ./types/events.ts
```

##### 7. Update Imports

Update your imports to use the new type definitions:

```typescript
// Import generated types
import { EventEmitter } from './types/events';

// Your service will now have full type safety
constructor(private eventEmitter: EventEmitter) {}
```

#### Breaking Changes

- `@EventType` decorator removed
- `@EventField` decorator removed
- Event classes no longer needed
- Configuration structure changed
- Database schema updated

#### Migration Script

We provide an automated migration script to help with the transition:

```bash
npx @afidos/nestjs-event-notifications-migrator migrate --from 0.x --to 1.x
```

---

# DEPLOYMENT.md

## Deployment Guide

### Prerequisites

- Node.js 16+ or 18+
- PostgreSQL 12+
- Redis 6+
- NestJS 10+

### Environment Setup

#### Development Environment

1. **Clone and Install**
```bash
git clone <your-repo>
cd your-app
npm install
```

2. **Environment Variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Run migrations
npm run migration:run
```

4. **Start Development**
```bash
npm run start:dev
```

#### Production Environment

##### Option 1: Docker Deployment

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "run", "start:prod"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - APP_MODE=hybrid
    depends_on:
      - postgres
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: event_notifications
      POSTGRES_USER: postgres
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

  # Optional: Separate worker instances
  worker:
    build: .
    environment:
      - NODE_ENV=production
      - APP_MODE=worker
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 3

volumes:
  postgres_data:
  redis_data:
```

##### Option 2: Kubernetes Deployment

**k8s/deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-notifications-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-notifications-api
  template:
    metadata:
      labels:
        app: event-notifications-api
    spec:
      containers:
      - name: api
        image: your-registry/event-notifications:latest
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
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-notifications-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: event-notifications-worker
  template:
    metadata:
      labels:
        app: event-notifications-worker
    spec:
      containers:
      - name: worker
        image: your-registry/event-notifications:latest
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

### Monitoring Setup

#### Prometheus Metrics

```typescript
// Add to your main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'event_notifications_',
        },
      },
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

#### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Event Notifications Dashboard",
    "panels": [
      {
        "title": "Event Emission Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(event_notifications_events_emitted_total[5m])",
            "legendFormat": "{{event_type}}"
          }
        ]
      },
      {
        "title": "Notification Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(event_notifications_notifications_sent_total[5m]) / rate(event_notifications_notifications_attempted_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "event_notifications_queue_jobs_waiting"
          }
        ]
      }
    ]
  }
}
```

### Performance Tuning

#### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX CONCURRENTLY idx_event_logs_status ON event_logs(status);
CREATE INDEX CONCURRENTLY idx_event_logs_created_at ON event_logs(created_at);
CREATE INDEX CONCURRENTLY idx_event_recipients_event_type ON event_recipients(event_type_name);

-- Partition large tables
CREATE TABLE event_logs_y2024m01 PARTITION OF event_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### Redis Configuration

```redis
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

#### Application Configuration

```typescript
// Performance optimizations
{
  queue: {
    redis: {
      host: process.env.REDIS_HOST,
      port: 6379,
      // Connection pooling
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    },
    concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 10,
    // Batch processing
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
  // Database connection pooling
  database: {
    type: 'postgres',
    extra: {
      max: 20, // Max connections
      min: 5,  // Min connections
      acquire: 30000,
      idle: 10000,
    },
  },
}
```

### Scaling Strategies

#### Horizontal Scaling

1. **API Instances**: Scale API servers based on CPU/memory usage
2. **Worker Instances**: Scale workers based on queue depth
3. **Database**: Use read replicas for reporting queries
4. **Redis**: Use Redis Cluster for high availability

#### Load Balancing

```nginx
# nginx.conf
upstream event_notifications_api {
    least_conn;
    server api-1:3000;
    server api-2:3000;
    server api-3:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://event_notifications_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /notifications/logs {
        # Route to read replicas for reporting
        proxy_pass http://read_replica_api;
    }
}
```

### Security Considerations

#### API Security

```typescript
// Add security middleware
import { helmet } from 'helmet';
import { rateLimit } from 'express-rate-limit';

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
}));

// API Authentication
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  // Protected endpoints
}
```

#### Data Protection

```typescript
// Encrypt sensitive data
{
  providers: {
    email: {
      driver: 'smtp',
      config: {
        // Use encrypted environment variables
        auth: {
          user: decrypt(process.env.SMTP_USER_ENCRYPTED),
          pass: decrypt(process.env.SMTP_PASS_ENCRYPTED),
        },
      },
    },
  },
}
```

### Backup and Recovery

#### Database Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/db-backups/
```

#### Disaster Recovery

```yaml
# disaster-recovery.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disaster-recovery-plan
data:
  recovery-steps: |
    1. Restore database from latest backup
    2. Restore Redis state (if persistent)
    3. Deploy application with READ_ONLY=true
    4. Verify data integrity
    5. Switch to normal operation
    6. Monitor for issues
```

---

# TROUBLESHOOTING.md

## Troubleshooting Guide

### Common Issues

#### 1. Events Not Being Processed

**Symptoms:**
- Events are emitted but no notifications sent
- Queue shows pending jobs but workers not processing

**Diagnostic Steps:**
```bash
# Check queue status
curl http://localhost:3000/notifications/stats

# Check worker logs
docker logs event-notifications-worker

# Check Redis connection
redis-cli ping
```

**Solutions:**
- Verify Redis connection configuration
- Check worker process is running with correct mode
- Ensure event recipients are configured
- Verify provider configurations

#### 2. High Memory Usage

**Symptoms:**
- Application consuming excessive memory
- OOM errors in production

**Diagnostic Steps:**
```bash
# Monitor memory usage
docker stats

# Check queue depth
curl http://localhost:3000/notifications/stats | jq '.queueStats'

# Profile memory usage
node --inspect your-app.js
```

**Solutions:**
- Increase `removeOnComplete` and `removeOnFail` settings
- Implement job result cleanup
- Scale worker instances
- Optimize payload sizes

#### 3. Notification Delivery Failures

**Symptoms:**
- High failure rates in notification stats
- Provider health checks failing

**Diagnostic Steps:**
```bash
# Test specific provider
npx nest-commander test-notification-config --provider email

# Check provider logs
curl http://localhost:3000/notifications/logs?status=failed

# Verify external service connectivity
curl -v https://api.external-service.com/health
```

**Solutions:**
- Verify provider credentials
- Check network connectivity
- Review rate limiting settings
- Update provider configurations

#### 4. Database Performance Issues

**Symptoms:**
- Slow API responses
- High database CPU usage
- Query timeouts

**Diagnostic Steps:**
```sql
-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'event_logs';
```

**Solutions:**
- Add missing indexes
- Implement table partitioning
- Archive old event logs
- Optimize query patterns

### Debugging Tools

#### Enable Debug Logging

```typescript
// main.ts
import { Logger } from '@nestjs/common';

const app = await NestFactory.create(AppModule, {
  logger: process.env.NODE_ENV === 'development' 
    ? ['debug', 'error', 'log', 'verbose', 'warn']
    : ['error', 'warn', 'log'],
});
```

#### Health Check Endpoint

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private eventEmitter: EventEmitterService,
    @InjectQueue('notifications') private queue: Queue,
  ) {}

  @Get()
  async checkHealth() {
    const queueHealth = await this.checkQueueHealth();
    const dbHealth = await this.checkDatabaseHealth();
    const providersHealth = await this.checkProvidersHealth();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        queue: queueHealth,
        database: dbHealth,
        providers: providersHealth,
      },
    };
  }

  private async checkQueueHealth() {
    try {
      const stats = await this.queue.getJobCounts();
      return {
        status: 'healthy',
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
```

#### Metrics Collection

```typescript
// metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private eventsEmitted = new Counter({
    name: 'events_emitted_total',
    help: 'Total number of events emitted',
    labelNames: ['event_type', 'mode'],
  });

  private notificationsSent = new Counter({
    name: 'notifications_sent_total',
    help: 'Total number of notifications sent',
    labelNames: ['channel', 'status'],
  });

  private processingDuration = new Histogram({
    name: 'event_processing_duration_seconds',
    help: 'Event processing duration',
    labelNames: ['event_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  incrementEventsEmitted(eventType: string, mode: string) {
    this.eventsEmitted.inc({ event_type: eventType, mode });
  }

  incrementNotificationsSent(channel: string, status: string) {
    this.notificationsSent.inc({ channel, status });
  }

  recordProcessingDuration(eventType: string, duration: number) {
    this.processingDuration.observe({ event_type: eventType }, duration);
  }
}
```

### Performance Optimization

#### Query Optimization

```sql
-- Optimize event logs queries
EXPLAIN ANALYZE 
SELECT * FROM event_logs 
WHERE event_type = 'user.created' 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC 
LIMIT 100;

-- Create optimal indexes
CREATE INDEX CONCURRENTLY idx_event_logs_type_created 
ON event_logs(event_type, created_at DESC) 
WHERE status = 'completed';
```

#### Memory Optimization

```typescript
// Implement streaming for large datasets
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

#### Caching Strategy

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

### Monitoring Alerts

#### Prometheus Alerting Rules

```yaml
# alerts.yml
groups:
- name: event-notifications
  rules:
  - alert: HighFailureRate
    expr: rate(notifications_sent_total{status="failed"}[5m]) / rate(notifications_sent_total[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High notification failure rate"
      description: "Notification failure rate is {{ $value | humanizePercentage }}"

  - alert: QueueBacklog
    expr: queue_jobs_waiting > 1000
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Large queue backlog"
      description: "Queue has {{ $value }} waiting jobs"

  - alert: WorkerDown
    expr: up{job="event-notifications-worker"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Worker instance down"
      description: "Worker instance {{ $labels.instance }} is down"
```

### Emergency Procedures

#### Circuit Breaker Implementation

```typescript
// circuit-breaker.service.ts
@Injectable()
export class CircuitBreakerService {
  private breakers = new Map<string, any>();

  async callWithBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    options = { threshold: 5, timeout: 60000 }
  ): Promise<T> {
    let breaker = this.breakers.get(key);
    
    if (!breaker) {
      breaker = new CircuitBreaker(fn, options);
      this.breakers.set(key, breaker);
    }

    return breaker.fire();
  }
}
```

#### Graceful Degradation

```typescript
// In case of provider failure, implement fallback
async processNotifications(eventType: string, payload: any) {
  const primaryResults = await this.tryPrimaryProviders(eventType, payload);
  
  if (primaryResults.every(r => r.status === 'failed')) {
    // Fallback to alternative providers
    return this.tryFallbackProviders(eventType, payload);
  }
  
  return primaryResults;
}
```

#### Data Recovery

```bash
#!/bin/bash
# recovery-script.sh

echo "Starting event notifications recovery..."

# 1. Stop all workers
kubectl scale deployment event-notifications-worker --replicas=0

# 2. Backup current state
pg_dump $DB_URL > recovery_backup_$(date +%s).sql

# 3. Restore from backup if needed
# psql $DB_URL < backup_file.sql

# 4. Clear failed jobs
redis-cli FLUSHDB 1

# 5. Restart services
kubectl scale deployment event-notifications-worker --replicas=5
kubectl rollout restart deployment event-notifications-api

echo "Recovery completed. Monitor logs for any issues."
```

This completes the comprehensive documentation for troubleshooting, performance optimization, and emergency procedures for the NestJS event notifications package.