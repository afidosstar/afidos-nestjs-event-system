import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';

/**
 * Module simple pour la configuration SMTP
 */
@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: () => ({
                transport: {
                    host: process.env.SMTP_HOST || 'localhost',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER || '',
                        pass: process.env.SMTP_PASSWORD || '',
                    },
                },
                defaults: {
                    from: process.env.SMTP_FROM || 'noreply@example.com',
                },
            }),
        }),
    ],
    exports: [MailerModule],
})
export class CustomMailerModule {}