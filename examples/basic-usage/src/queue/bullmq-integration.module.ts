import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullMQQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider';
import { QUEUE_PROVIDER_TOKEN } from '@afidos/nestjs-event-notifications';

/**
 * Module d'intégration BullMQ avec @nestjs/bullmq
 * 
 * Utilise les packages officiels NestJS pour une intégration native
 */
@Module({
  imports: [
    // Configuration BullMQ avec Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    
    // Enregistrement de la queue 'notifications'
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [
    // Provider personnalisé utilisant @nestjs/bullmq
    {
      provide: QUEUE_PROVIDER_TOKEN,
      useFactory: (queue) => {
        return BullMQQueueProvider.create('notifications', queue);
      },
      inject: [getQueueToken('notifications')], // Token correct pour @nestjs/bullmq
    },
  ],
  exports: [
    QUEUE_PROVIDER_TOKEN,
    BullModule,
  ],
})
export class BullMQIntegrationModule {}