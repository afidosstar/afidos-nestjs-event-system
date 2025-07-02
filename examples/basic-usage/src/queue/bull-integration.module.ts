import { Module } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bull-queue.provider';
import { QUEUE_PROVIDER_TOKEN } from '@afidos/nestjs-event-notifications';

/**
 * Module d'intégration Bull (legacy) avec @nestjs/bull
 * 
 * Utilise les packages officiels NestJS pour une intégration native
 * Recommandé uniquement pour compatibilité avec projets existants
 */
@Module({
  imports: [
    // Configuration Bull avec Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
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
    // Provider personnalisé utilisant @nestjs/bull
    {
      provide: QUEUE_PROVIDER_TOKEN,
      useFactory: (queue) => {
        return BullQueueProvider.create('notifications', queue);
      },
      inject: [getQueueToken('notifications')], // Token correct pour @nestjs/bull
    },
  ],
  exports: [
    QUEUE_PROVIDER_TOKEN,
    BullModule,
  ],
})
export class BullIntegrationModule {}