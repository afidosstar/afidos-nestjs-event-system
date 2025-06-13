import { ConfigService } from '@nestjs/config';
import { EventNotificationsConfig } from '@afidos/nestjs-event-notifications';
import { eventTypesConfig } from './event-types/index';
import { SlackProvider } from '../providers/slack.provider';
import { DiscordProvider } from '../providers/discord.provider';
import { CustomEmailProvider } from '../providers/custom-email.provider';

export const eventNotificationsConfigFactory = async (
    configService: ConfigService,
): Promise<EventNotificationsConfig> => {
    const mode = configService.get('notifications.mode') as 'api' | 'worker' | 'hybrid';

    return {
        eventTypes: eventTypesConfig,
        mode,

        providers: {
            // Email provider with fallback
            email: configService.get('notifications.providers.email.enabled') ? {
                driver: 'smtp',
                config: {
                    host: configService.get('notifications.providers.email.smtp.host'),
                    port: configService.get('notifications.providers.email.smtp.port'),
                    secure: configService.get('notifications.providers.email.smtp.secure'),
                    auth: {
                        user: configService.get('notifications.providers.email.smtp.user'),
                        pass: configService.get('notifications.providers.email.smtp.pass'),
                    },
                    from: configService.get('notifications.providers.email.smtp.from'),
                    // Template configuration
                    templates: {
                        baseUrl: process.env.EMAIL_TEMPLATE_BASE_URL || 'https://example.com',
                        defaultLanguage: 'en',
                        supportedLanguages: ['en', 'fr', 'es'],
                    },
                },
            } : undefined,

            // SMS provider
            sms: configService.get('notifications.providers.sms.enabled') ? {
                driver: 'twilio',
                config: {
                    accountSid: configService.get('notifications.providers.sms.twilio.accountSid'),
                    authToken: configService.get('notifications.providers.sms.twilio.authToken'),
                    fromNumber: configService.get('notifications.providers.sms.twilio.fromNumber'),
                    // Rate limiting per recipient
                    rateLimiting: {
                        windowMs: 60000, // 1 minute
                        maxSms: 5, // max 5 SMS per minute per recipient
                    },
                },
            } : undefined,

            // Push notifications
            push: configService.get('notifications.providers.push.enabled') ? {
                driver: 'firebase',
                config: {
                    serverKey: configService.get('notifications.providers.push.firebase.serverKey'),
                    senderId: configService.get('notifications.providers.push.firebase.senderId'),
                    // Additional options
                    collapseKey: 'general',
                    priority: 'high',
                    timeToLive: 86400, // 24 hours
                },
            } : undefined,

            // Webhook provider with circuit breaker
            webhook: configService.get('notifications.providers.webhook.enabled') ? {
                driver: 'http',
                config: {
                    timeout: configService.get('notifications.providers.webhook.timeout'),
                    retries: configService.get('notifications.providers.webhook.retries'),
                    circuitBreaker: {
                        enabled: true,
                        threshold: 5, // failures before opening circuit
                        timeout: 60000, // 1 minute timeout
                        monitor: true,
                    },
                    headers: {
                        'User-Agent': 'EventNotifications/1.0',
                        'X-Source': 'advanced-example',
                    },
                },
            } : undefined,
        },

        // Queue configuration with advanced options
        queue: {
            redis: {
                host: configService.get('redis.host'),
                port: configService.get('redis.port'),
                password: configService.get('redis.password'),
                db: configService.get('redis.db'),
                retryDelayOnFailover: configService.get('redis.retryDelayOnFailover'),
                enableReadyCheck: configService.get('redis.enableReadyCheck'),
                maxRetriesPerRequest: 3,
                connectTimeout: 10000,
                commandTimeout: 5000,
            },
            concurrency: configService.get('notifications.queue.concurrency'),
            retryOptions: {
                attempts: configService.get('notifications.queue.retryAttempts'),
                delay: configService.get('notifications.queue.retryDelay'),
                backoff: 'exponential',
            },
            defaultJobOptions: {
                removeOnComplete: configService.get('notifications.queue.removeOnComplete'),
                removeOnFail: configService.get('notifications.queue.removeOnFail'),
                attempts: configService.get('notifications.queue.retryAttempts'),
                backoff: {
                    type: 'exponential',
                    delay: configService.get('notifications.queue.retryDelay'),
                },
            },
        },

        // Database configuration
        database: {
            autoSync: configService.get('database.synchronize'),
            entities: ['dist/**/*.entity{.ts,.js}'],
            logging: configService.get('database.logging'),
        },

        // Expose management API
        exposeManagementApi: configService.get('notifications.exposeApi'),
        apiPrefix: configService.get('notifications.apiPrefix'),

        // Monitoring configuration
        monitoring: {
            enabled: configService.get('monitoring.enabled'),
            metricsPrefix: configService.get('monitoring.metricsPrefix'),
        },

        // Custom providers
        customProviders: [
            // Slack provider
            ...(configService.get('notifications.providers.slack.enabled') ? [{
                provide: 'SLACK_PROVIDER',
                useFactory: () => new SlackProvider({
                    webhookUrl: configService.get('notifications.providers.slack.webhookUrl'),
                    botToken: configService.get('notifications.providers.slack.botToken'),
                }),
            }] : []),

            // Discord provider
            ...(process.env.DISCORD_WEBHOOK_URL ? [{
                provide: 'DISCORD_PROVIDER',
                useFactory: () => new DiscordProvider({
                    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
                }),
            }] : []),

            // Custom email provider (fallback)
            {
                provide: 'CUSTOM_EMAIL_PROVIDER',
                useFactory: () => new CustomEmailProvider({
                    apiKey: process.env.CUSTOM_EMAIL_API_KEY,
                    apiUrl: process.env.CUSTOM_EMAIL_API_URL,
                }),
            },
        ],
    };
};
