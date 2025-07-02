import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { EventNotificationsModule } from '@afidos/nestjs-event-notifications';
import { BullQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bull-queue.provider';

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
 * 🔧 EXEMPLE: Configuration avec Bull Provider
 * 
 * Prérequis:
 * 1. npm install bull @nestjs/bull redis
 * 2. Serveur Redis en cours d'exécution
 * 
 * Avantages:
 * - Performance élevée pour production
 * - Dashboard Bull-board disponible
 * - Monitoring avancé des jobs
 * 
 * Inconvénients:
 * - Dépendance Redis requise
 * - Configuration plus complexe
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

    // ⚡ Configuration Bull pour Redis
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
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

    // 🎯 Configuration EventNotifications avec Bull Provider
    EventNotificationsModule.forRoot<MyAppEvents>({
      config: packageConfig,
      recipientLoader: StaticRecipientLoader,
      queueProvider: BullQueueProvider  // ← Import direct du Bull Provider
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
export class AppWithBullModule {}

/**
 * 📝 Instructions pour utiliser ce module:
 * 
 * 1. Renommer ce fichier en app.module.ts
 * 2. Installer les dépendances:
 *    npm install bull @nestjs/bull redis
 * 3. Démarrer Redis:
 *    docker run -d -p 6379:6379 redis:alpine
 * 4. Configurer les variables d'environnement:
 *    REDIS_HOST=localhost
 *    REDIS_PORT=6379
 * 5. Démarrer l'application:
 *    npm run start:dev
 */