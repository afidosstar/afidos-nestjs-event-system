import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
    EventNotificationsModule
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

// Entités (pour accès aux données si nécessaire)
import { User } from './user/user.entity';
import { Order } from './order/order.entity';
import { EventType } from './entities/event-type.entity';

/**
 * Module dédié au worker pour traitement asynchrone des notifications
 * Ce module est conçu pour fonctionner dans un processus séparé
 */
@Module({
    imports: [
        // Configuration TypeORM (même base que l'API)
        TypeOrmModule.forRoot({
            type: 'sqlite',
            database: 'db.sqlite',
            entities: [User, Order, EventType],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development'
        }),

        // Configuration des entités utilisées
        TypeOrmModule.forFeature([User, Order, EventType]),
        
        // Configuration du mailer pour l'email provider
        CustomMailerModule,

        // Provider Modules
        TelegramModule,
        WebhookModule,

        // Module des notifications en mode worker
        EventNotificationsModule.forRoot<MyAppEvents>({
            ...packageConfig,
            mode: 'worker',  // ← Mode worker uniquement
            
            // Configuration Redis (même que l'API)
            queue: {
                redis: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    password: process.env.REDIS_PASSWORD,
                    db: parseInt(process.env.REDIS_DB || '0')
                }
            },

            // Logs détaillés pour le worker
            global: {
                ...packageConfig.global,
                enableDetailedLogs: true
            }
        })
    ],
    providers: [
        // Recipient loader
        StaticRecipientLoader,

        // Email provider (not in module yet)
        EmailProvider
    ]
})
export class WorkerModule {}