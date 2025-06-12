import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventNotificationsModule } from '@afidos/n estjs-event-notifications';
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

// examples/basic-usage/src/config/event-types.config.ts
import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const eventTypesConfig: EventTypesConfig = {
  // User Events
  'user.created': {
    description: 'User account created successfully',
    schema: {
      userId: { type: 'number', required: true },
      email: { type: 'string', required: true },
      firstName: { type: 'string', required: true },
      lastName: { type: 'string', required: true },
      registrationSource: { type: 'string', required: false },
    },
    defaultProcessing: 'async',
    waitForResult: false,
    channels: ['email'],
    templates: {
      email: 'user-welcome',
    },
    priority: 'normal',
  },

  'user.password.reset': {
    description: 'Password reset requested',
    schema: {
      userId: { type: 'number', required: true },
      email: { type: 'string', required: true },
      resetToken: { type: 'string', required: true },
      expiresAt: { type: 'date', required: true },
    },
    defaultProcessing: 'sync',
    waitForResult: true,
    channels: ['email'],
    templates: {
      email: 'password-reset',
    },
    priority: 'high',
    retryPolicy: {
      attempts: 5,
      delay: 1000,
      backoff: 'exponential',
    },
  },

  // Order Events
  'order.created': {
    description: 'New order placed',
    schema: {
      orderId: { type: 'string', required: true },
      customerId: { type: 'number', required: true },
      customerEmail: { type: 'string', required: true },
      totalAmount: { type: 'number', required: true },
      currency: { type: 'string', required: true },
      items: { type: 'array', required: true },
    },
    defaultProcessing: 'async',
    waitForResult: false,
    channels: ['email', 'webhook'],
    templates: {
      email: 'order-confirmation',
    },
    priority: 'high',
  },

  'order.shipped': {
    description: 'Order has been shipped',
    schema: {
      orderId: { type: 'string', required: true },
      customerId: { type: 'number', required: true },
      trackingNumber: { type: 'string', required: true },
      carrier: { type: 'string', required: true },
      estimatedDelivery: { type: 'date', required: false },
    },
    defaultProcessing: 'async',
    waitForResult: false,
    channels: ['email', 'sms'],
    templates: {
      email: 'shipping-notification',
      sms: 'shipping-sms',
    },
    priority: 'normal',
  },

  // Payment Events
  'payment.completed': {
    description: 'Payment processed successfully',
    schema: {
      paymentId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
      customerId: { type: 'number', required: true },
      amount: { type: 'number', required: true },
      method: { type: 'string', required: true },
    },
    defaultProcessing: 'sync',
    waitForResult: true,
    channels: ['email', 'webhook'],
    templates: {
      email: 'payment-confirmation',
    },
    priority: 'high',
  },

  'payment.failed': {
    description: 'Payment processing failed',
    schema: {
      paymentId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
      customerId: { type: 'number', required: true },
      amount: { type: 'number', required: true },
      failureReason: { type: 'string', required: true },
    },
    defaultProcessing: 'sync',
    waitForResult: true,
    channels: ['email'],
    templates: {
      email: 'payment-failed',
    },
    priority: 'high',
    retryPolicy: {
      attempts: 3,
      delay: 5000,
      backoff: 'linear',
    },
  },
};
