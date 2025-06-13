import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import {
    NotificationProvider,
    NotificationResult,
    NotificationContext,
    NotificationChannel
} from '../../types/interfaces';

export interface SmtpConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
        user: string;
        pass: string;
    };
    from: string;
    timeout?: number;
}

export interface EmailPayload {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

/**
 * Provider SMTP pour l'envoi d'emails
 */
@Injectable()
export class SmtpEmailProvider implements NotificationProvider {
    readonly name = 'smtp';
    readonly channel: NotificationChannel = 'email';

    private readonly logger = new Logger(SmtpEmailProvider.name);
    private transporter: Transporter;
    private isConfigured = false;

    constructor(private config: SmtpConfig) {
        this.initializeTransporter();
    }

    /**
     * Initialiser le transporteur SMTP
     */
    private initializeTransporter(): void {
        try {
            this.transporter = createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: this.config.secure || this.config.port === 465,
                auth: this.config.auth,
                connectionTimeout: this.config.timeout || 10000,
                greetingTimeout: this.config.timeout || 10000,
                socketTimeout: this.config.timeout || 10000
            });

            this.isConfigured = true;
            this.logger.log(`SMTP provider initialized: ${this.config.host}:${this.config.port}`);

        } catch (error) {
            this.logger.error('Failed to initialize SMTP transporter', {
                error: error.message,
                host: this.config.host,
                port: this.config.port
            });
            this.isConfigured = false;
        }
    }

    /**
     * Envoyer un email
     */
    async send(payload: EmailPayload, context: NotificationContext): Promise<NotificationResult> {
        if (!this.isConfigured) {
            return {
                channel: this.channel,
                provider: this.name,
                status: 'failed',
                error: 'SMTP provider not properly configured',
                sentAt: new Date(),
                attempts: context.attempt
            };
        }

        const startTime = Date.now();

        try {
            // Valider le payload
            //this.validateEmailPayload(payload);

            // Préparer l'email
            const mailOptions = {
                from: this.config.from,
                to: 'test@gmail.com',
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
                cc: payload.cc ? (Array.isArray(payload.cc) ? payload.cc.join(', ') : payload.cc) : undefined,
                bcc: payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc.join(', ') : payload.bcc) : undefined,
                attachments: payload.attachments,
                headers: {
                    'X-Correlation-ID': context.correlationId,
                    'X-Event-Type': context.eventType,
                    'X-Attempt': context.attempt.toString()
                }
            };

            this.logger.debug('Sending email', {
                correlationId: context.correlationId,
                to: mailOptions.to,
                subject: payload.subject,
                attempt: context.attempt
            });

            // Envoyer l'email
            const info = await this.transporter.sendMail(mailOptions);
            const duration = Date.now() - startTime;

            this.logger.debug('Email sent successfully', {
                correlationId: context.correlationId,
                messageId: info.messageId,
                duration
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'sent',
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    messageId: info.messageId,
                    duration,
                    response: info.response,
                    recipients: mailOptions.to
                }
            };

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error('Failed to send email', {
                correlationId: context.correlationId,
                error: error.message,
                duration,
                attempt: context.attempt
            });

            return {
                channel: this.channel,
                provider: this.name,
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: { duration }
            };
        }
    }

    /**
     * Vérifier la santé du provider
     */
    async healthCheck(): Promise<boolean> {
        if (!this.isConfigured) {
            return false;
        }

        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            this.logger.warn('SMTP health check failed', {
                error: error.message,
                host: this.config.host
            });
            return false;
        }
    }

    /**
     * Valider la configuration
     */
    validateConfig(config: SmtpConfig): boolean | string[] {
        const errors: string[] = [];

        if (!config.host) errors.push('host is required');
        if (!config.port) errors.push('port is required');
        if (!config.auth?.user) errors.push('auth.user is required');
        if (!config.auth?.pass) errors.push('auth.pass is required');
        if (!config.from) errors.push('from address is required');

        if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('port must be between 1 and 65535');
        }

        return errors.length === 0 ? true : errors;
    }

    /**
     * Valider le payload d'email
     */
    private validateEmailPayload(payload: EmailPayload): void {
        if (!payload.to) {
            throw new Error('Recipient (to) is required');
        }

        if (!payload.subject) {
            throw new Error('Subject is required');
        }

        if (!payload.text && !payload.html) {
            throw new Error('Either text or html content is required');
        }

        // Valider les adresses email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];

        for (const recipient of recipients) {
            if (!emailRegex.test(recipient)) {
                throw new Error(`Invalid email address: ${recipient}`);
            }
        }
    }
}
