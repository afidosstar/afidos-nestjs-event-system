import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {User} from "./user/user.entity";
import {Order} from "./order/order.entity";
import {
  EventNotificationsModule,
  filterProvidersByDrivers
} from '@afidos/nestjs-event-notifications';
import {MyAppEvents, packageConfig} from "./config";
import {UserModule} from "./user/user.module";
import {OrderModule} from "./order/order.module";
import {HealthController} from "./health/health.controller";
import {EmailProvider} from "./providers/email.provider";
import {TelegramProvider} from "./providers/telegram.provider";
import {WebhookProvider} from "./providers/webhook.provider";
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
      entities: [User, Order],
      synchronize: process.env.NODE_ENV === 'development'
    }),

    // Configuration du package EventNotifications 
    EventNotificationsModule.forRoot<MyAppEvents>(packageConfig),
    UserModule,
    OrderModule
  ],
  providers: [
    AppService,

    // Recipient loader
    StaticRecipientLoader,

    // Event Handlers
    UserAnalyticsHandler,
    AuditLogHandler,

    // Notification Providers - Filtrés automatiquement selon les drivers configurés
    ...filterProvidersByDrivers([EmailProvider, TelegramProvider, WebhookProvider], packageConfig)
  ]
})
export class AppModule {}
