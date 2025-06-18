import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import {User} from "./user/user.entity";
import {Order} from "./order/order.entity";
import {
  EventNotificationsModule,
  HttpDriver,
  SmtpDriver
} from '@afidos/nestjs-event-notifications';
import {MyAppEvents, packageConfig} from "./config";
import {UserModule} from "./user/user.module";
import {OrderModule} from "./order/order.module";
import {HealthController} from "./health/health.controller";
import {EmailProvider} from "./providers/email.provider";
import {TelegramProvider} from "./providers/telegram.provider";
import {WebhookProvider} from "./providers/webhook.provider";
import {StaticRecipientLoader} from "./loaders/static-recipient.loader";
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
    // Drivers préconçus
    HttpDriver,
    {
      provide: SmtpDriver,
      useFactory: () => new SmtpDriver({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || 'your-email@gmail.com',
          pass: process.env.SMTP_PASS || 'your-password'
        }
      })
    },
    
    // Recipient loader
    StaticRecipientLoader,
    
    // Providers de notifications (configurés dans config.ts et implémentés ici)
    {
      provide: EmailProvider,
      useFactory: (recipientLoader: StaticRecipientLoader, smtpDriver: SmtpDriver) =>
        new EmailProvider(recipientLoader, smtpDriver, process.env.SMTP_FROM || 'noreply@example.com'),
      inject: [StaticRecipientLoader, SmtpDriver]
    },
    {
      provide: TelegramProvider,
      useFactory: (recipientLoader: StaticRecipientLoader, httpDriver: HttpDriver) =>
        new TelegramProvider(recipientLoader, httpDriver, {
          botToken: process.env.TELEGRAM_BOT_TOKEN || '123456:ABC-DEF'
        }),
      inject: [StaticRecipientLoader, HttpDriver]
    },
    {
      provide: WebhookProvider,
      useFactory: (recipientLoader: StaticRecipientLoader, httpDriver: HttpDriver) =>
        new WebhookProvider(recipientLoader, httpDriver),
      inject: [StaticRecipientLoader, HttpDriver]
    }
  ]
})
export class AppModule {}
