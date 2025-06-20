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
import {EmailProvider} from "./notifications/providers/email-provider/email.provider";
import {CustomMailerModule} from "./notifications/providers/email-provider/mailer.module";
import {TelegramProvider} from "./notifications/providers/telegram.provider";
import {WebhookProvider} from "./notifications/providers/webhook.provider";
import {StaticRecipientLoader} from "./loaders/static-recipient.loader";
import {UserAnalyticsHandler} from "./handlers/user-analytics.handler";
import {AuditLogHandler} from "./handlers/audit-log.handler";
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

    // Configuration du package EventNotifications 
    EventNotificationsModule.forRoot<MyAppEvents>(packageConfig),
    
    // Configuration du mailer pour l'email provider
    CustomMailerModule,
    
    // Configuration des entités pour les providers
    TypeOrmModule.forFeature([EventType]),
    
    UserModule,
    OrderModule,
    EventTypesModule,
    CommandsModule
  ],
  providers: [
    AppService,

    // Recipient loader
    StaticRecipientLoader,

    // Event Handlers
    UserAnalyticsHandler,
    AuditLogHandler,

    // Notification Providers 
    EmailProvider,
    TelegramProvider,
    WebhookProvider
  ]
})
export class AppModule {}
