import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
    EventNotificationsModule, 
    HttpDriver, 
    SmtpDriver 
} from '@afidos/nestjs-event-notifications';

// Providers
import { EmailProvider } from './providers/email.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { WebhookProvider } from './providers/webhook.provider';

// Loaders
import { StaticRecipientLoader } from './loaders/static-recipient.loader';

// Configuration
import { packageConfig } from './config';

// Entités (pour accès aux données si nécessaire)
import { User } from './user/user.entity';
import { Order } from './order/order.entity';

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
            entities: [User, Order],
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development'
        }),

        // Configuration des entités utilisées
        TypeOrmModule.forFeature([User, Order]),

        // Module des notifications en mode worker
        EventNotificationsModule.forRoot({
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
        // Drivers
        HttpDriver,
        {
            provide: SmtpDriver,
            useFactory: () => new SmtpDriver({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER || 'your-email@gmail.com',
                    pass: process.env.SMTP_PASS || 'your-password'
                }
            })
        },

        // Recipient loader
        StaticRecipientLoader,

        // Providers de notifications (auto-découverte via @InjectableNotifier)
        {
            provide: EmailProvider,
            useFactory: (loader: StaticRecipientLoader, smtp: SmtpDriver) => 
                new EmailProvider(
                    loader, 
                    smtp, 
                    process.env.SMTP_FROM || 'noreply@example.com'
                ),
            inject: [StaticRecipientLoader, SmtpDriver]
        },
        {
            provide: TelegramProvider,
            useFactory: (loader: StaticRecipientLoader, http: HttpDriver) => 
                new TelegramProvider(loader, http, {
                    botToken: process.env.TELEGRAM_BOT_TOKEN || '123456:ABC-DEF',
                    parseMode: 'HTML'
                }),
            inject: [StaticRecipientLoader, HttpDriver]
        },
        {
            provide: WebhookProvider,
            useFactory: (loader: StaticRecipientLoader, http: HttpDriver) => 
                new WebhookProvider(loader, http, {
                    timeout: 10000,
                    retryableStatusCodes: [202]
                }),
            inject: [StaticRecipientLoader, HttpDriver]
        }
    ]
})
export class WorkerModule {}