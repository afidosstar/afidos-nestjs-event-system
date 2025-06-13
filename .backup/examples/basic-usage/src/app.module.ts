import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventNotificationsModule } from '@afidos/nestjs-event-notifications';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { eventTypesConfig } from './config/event-types.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database configuration
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'event_notifications_example',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),

    // Event Notifications configuration
    EventNotificationsModule.forRoot({
      eventTypes: eventTypesConfig,
      mode: 'hybrid',

      providers: {
        email: {
          driver: 'smtp',
          config: {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT) || 1025, // MailHog for development
            secure: false,
            auth: process.env.SMTP_USER ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            } : undefined,
          },
        },
        sms: process.env.TWILIO_SID ? {
          driver: 'twilio',
          config: {
            accountSid: process.env.TWILIO_SID,
            authToken: process.env.TWILIO_TOKEN,
            fromNumber: process.env.TWILIO_FROM,
          },
        } : undefined,
        webhook: {
          driver: 'http',
          config: {
            timeout: 30000,
            retries: 3,
          },
        },
      },

      queue: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
        },
        concurrency: 5,
        retryOptions: {
          attempts: 3,
          delay: 2000,
          backoff: 'exponential',
        },
      },

      database: {
        autoSync: true,
        entities: ['dist/**/*.entity{.ts,.js}'],
      },

      exposeManagementApi: true,
      apiPrefix: 'notifications',

      monitoring: {
        enabled: true,
        metricsPrefix: 'basic_example_',
      },
    }),

    UserModule,
    OrderModule,
  ],
})
export class AppModule {}

