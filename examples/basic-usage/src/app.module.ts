import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {User} from "./user/user.entity";
import {Order} from "./order/order.entity";
import {EventType} from "./entities/event-type.entity";
import {
  EventNotificationsModule
} from '@afidos/nestjs-event-notifications';
import {MyAppEvents, packageConfig} from "./config";
import {UserModule} from "./user/user.module";
import {OrderModule} from "./order/order.module";
import {EventTypesModule} from "./event-types/event-types.module";
import {CommandsModule} from "./commands/commands.module";
import {HealthController} from "./health/health.controller";
import {CustomMailerModule} from "./notifications/providers/email/mailer.module";
import { TelegramModule } from "./notifications/providers/telegram/telegram.module";
import { WebhookModule } from "./notifications/providers/webhook/webhook.module";
import { TeamsModule } from "./notifications/providers/teams/teams.module";
import {StaticRecipientLoader} from "./loaders/static-recipient.loader";
import {UserAnalyticsHandler} from "./handlers/user-analytics.handler";
import {AuditLogHandler} from "./handlers/audit-log.handler";
import {EmailTemplateProvider} from "./notifications/template-providers/email-template.provider";
import {SmsTemplateProvider} from "./notifications/template-providers/sms-template.provider";
import {WebhookTemplateProvider} from "./notifications/template-providers/webhook-template.provider";
import {TeamsTemplateProvider} from "./notifications/template-providers/teams-template.provider";
import {BullMQQueueProvider}  from "@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider"
import { BullModule } from '@nestjs/bullmq';
import {ConfigModule} from "@nestjs/config";
@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Configuration TypeORM
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: './db.sqlite',
      autoLoadEntities: true,
      entities: [User, Order, EventType],
      synchronize: process.env.NODE_ENV === 'development'
    }),
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
    // Configuration du package EventNotifications avec la nouvelle API
    // ✅ Utilise FileQueueProvider par défaut (aucune dépendance externe)
    // Pour utiliser Bull/BullMQ, voir les commentaires ci-dessous
    EventNotificationsModule.forRoot<MyAppEvents>({
      imports:[ BullModule.registerQueue({name: 'notifications'}) ],
      config: packageConfig,
      recipientLoader: StaticRecipientLoader,
      queueProvider: BullMQQueueProvider
      // queueProvider omis = FileQueueProvider par défaut

      // 🔧 Pour utiliser Bull Provider:
      // 1. npm install bull @nestjs/bull redis
      // 2. Ajouter BullModule.forRoot() dans imports
      // 3. Décommenter la ligne suivante:
      // queueProvider: require('@afidos/nestjs-event-notifications/dist/queue/bull-queue.provider').BullQueueProvider

      // 🚀 Pour utiliser BullMQ Provider (recommandé en production):
      // 1. npm install bullmq @nestjs/bullmq redis
      // 2. Ajouter BullModule.forRoot() dans imports (note: c'est BullModule, pas BullMQModule)
      // 3. Décommenter la ligne suivante:
      // queueProvider: require('@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider').BullMQQueueProvider
    }),

    // Configuration du mailer pour l'email provider
    CustomMailerModule,

    // Configuration des entités pour les providers
    TypeOrmModule.forFeature([EventType]),

    UserModule,
    OrderModule,
    EventTypesModule,
    CommandsModule,

    // Provider Modules
    TelegramModule,
    WebhookModule,
    TeamsModule
  ],
  providers: [
    AppService,

    // Event Handlers
    UserAnalyticsHandler,
    AuditLogHandler,

    // Template Providers
    EmailTemplateProvider,
    SmsTemplateProvider,
    WebhookTemplateProvider,
    TeamsTemplateProvider,
  ]
})
export class AppModule {}
