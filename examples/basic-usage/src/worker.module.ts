import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    EventNotificationsModule,
    QUEUE_PROVIDER_TOKEN,
    RECIPIENT_LOADER_TOKEN
} from '@afidos/nestjs-event-notifications';

// Providers
import { EmailProvider } from './notifications/providers/email/email.provider';
import { CustomMailerModule } from './notifications/providers/email/mailer.module';
import { TelegramModule } from './notifications/providers/telegram/telegram.module';
import { WebhookModule } from './notifications/providers/webhook/webhook.module';

// Loaders
import { StaticRecipientLoader } from './loaders/static-recipient.loader';

// Configuration
import { packageConfig, MyAppEvents } from './config';

import { ConfigModule } from '@nestjs/config';

// Entités (pour accès aux données si nécessaire)
import { User } from './user/user.entity';
import { Order } from './order/order.entity';
import { EventType } from './entities/event-type.entity';
import {BullModule} from "@nestjs/bullmq";
import {BullMQQueueProvider} from '@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider'

/**
 * Module dédié au worker pour traitement asynchrone des notifications
 * Ce module est conçu pour fonctionner dans un processus séparé
 */
@Module({
    imports: [
        // Configuration d'environnement
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        // Configuration TypeORM (même base que l'API)
        TypeOrmModule.forRoot({
            type: 'sqlite',
            database: './db.sqlite',
            entities: [User, Order, EventType],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development'
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

        // Configuration des entités utilisées
        TypeOrmModule.forFeature([User, Order, EventType]),
        // Configuration du mailer pour l'email provider
        CustomMailerModule,

        // Provider Modules
        TelegramModule,
        WebhookModule,

        // Module des notifications en mode worker
        EventNotificationsModule.forWorker<MyAppEvents>({
            imports:[ BullModule.registerQueue({name: 'notifications'}) ],
            config: {
                ...packageConfig,

                // Configuration Redis (même que l'API)
                queue: {
                    redis: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: parseInt(process.env.REDIS_PORT || '6379'),
                        password: process.env.REDIS_PASSWORD,
                        db: parseInt(process.env.REDIS_DB || '0')
                    },
                    concurrency: 5,
                    prefix: 'basic-usage-notifications',
                    defaultJobOptions: {
                        attempts: 3,
                        delay: 1000,
                        removeOnComplete: 100,
                        removeOnFail: 50
                    }
                },

                // Logs détaillés pour le worker
                global: {
                    ...packageConfig.global,
                    enableDetailedLogs: true
                }
            },
            recipientLoader: StaticRecipientLoader,
            queueProvider: BullMQQueueProvider
        })
    ]
})
export class WorkerModule {}
