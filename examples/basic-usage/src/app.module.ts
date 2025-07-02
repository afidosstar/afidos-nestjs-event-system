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
@Module({
  controllers: [HealthController],
  imports: [
    // Configuration TypeORM
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db.sqlite',
      autoLoadEntities: true,
      entities: [User, Order, EventType],
      synchronize: process.env.NODE_ENV === 'development'
    }),

    // Configuration du package EventNotifications avec la nouvelle API
    EventNotificationsModule.forRoot<MyAppEvents>({
      config: packageConfig,
      recipientLoader: StaticRecipientLoader
    }),

    // Configuration du mailer pour l'email provider
    CustomMailerModule,

    // Configuration des entités pour les providers
    TypeOrmModule.forFeature([EventType]),

    UserModule,
    OrderModule,
    EventTypesModule,
    CommandsModule,
    CustomMailerModule,

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
