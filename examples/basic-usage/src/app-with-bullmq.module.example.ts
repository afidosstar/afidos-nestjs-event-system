import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { EventNotificationsModule } from '@afidos/nestjs-event-notifications';
import { BullMQQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider';

import { User } from "./user/user.entity";
import { Order } from "./order/order.entity";
import { EventType } from "./entities/event-type.entity";
import { MyAppEvents, packageConfig } from "./config";
import { UserModule } from "./user/user.module";
import { OrderModule } from "./order/order.module";
import { StaticRecipientLoader } from "./loaders/static-recipient.loader";
import { UserAnalyticsHandler } from "./handlers/user-analytics.handler";
import { AuditLogHandler } from "./handlers/audit-log.handler";
import { CustomMailerModule } from "./notifications/providers/email/mailer.module";
import { TelegramModule } from "./notifications/providers/telegram/telegram.module";
import { WebhookModule } from "./notifications/providers/webhook/webhook.module";

/**
 * 🚀 EXEMPLE: Configuration avec BullMQ Provider (RECOMMANDÉ pour production)
 *
 * Prérequis:
 * 1. npm install bullmq @nestjs/bullmq redis
 * 2. Serveur Redis en cours d'exécution
 *
 * Avantages:
 * - Performance très élevée (plus rapide que Bull)
 * - Architecture moderne avec TypeScript
 * - Meilleur support des workers distribués
 * - API plus propre et intuitive
 * - Maintenance active
 *
 * Inconvénients:
 * - Dépendance Redis requise
 * - Plus récent que Bull (moins d'écosystème)
 */
@Module({
  imports: [
    // Configuration TypeORM
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: './data/db.sqlite',
      autoLoadEntities: true,
      entities: [User, Order, EventType],
      synchronize: process.env.NODE_ENV === 'development'
    }),

    // ⚡ Configuration BullMQ pour Redis
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        // Options spécifiques à BullMQ
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        lazyConnect: true
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        }
      }
    }),

    // 🎯 Configuration EventNotifications avec BullMQ Provider
    EventNotificationsModule.forRoot<MyAppEvents>({
      imports: [BullModule.registerQueue({name: 'notifications'})],
      config: packageConfig,
      recipientLoader: StaticRecipientLoader,
      queueProvider: BullMQQueueProvider  // ← Import direct du BullMQ Provider
    }),

    // Modules de l'application
    TypeOrmModule.forFeature([EventType]),
    UserModule,
    OrderModule,
    CustomMailerModule,
    TelegramModule,
    WebhookModule
  ],
  providers: [
    // Event Handlers
    UserAnalyticsHandler,
    AuditLogHandler,
  ]
})
export class AppWithBullMQModule {}

/**
 * 📝 Instructions pour utiliser ce module:
 *
 * 1. Renommer ce fichier en app.module.ts
 * 2. Installer les dépendances:
 *    npm install bullmq @nestjs/bullmq redis
 * 3. Démarrer Redis:
 *    docker run -d -p 6379:6379 redis:alpine
 * 4. Configurer les variables d'environnement:
 *    REDIS_HOST=localhost
 *    REDIS_PORT=6379
 * 5. Démarrer l'application:
 *    npm run start:dev
 *
 * 🔧 Configuration Redis avancée pour production:
 *
 * docker run -d \
 *   --name redis-bullmq \
 *   -p 6379:6379 \
 *   -v redis_data:/data \
 *   redis:alpine redis-server \
 *   --appendonly yes \
 *   --maxmemory 256mb \
 *   --maxmemory-policy allkeys-lru
 */
