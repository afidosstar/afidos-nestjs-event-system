import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter, SendMailOptions } from 'nodemailer';

// Augmentation du module pour enregistrer la configuration SMTP
declare module '../types/interfaces' {
    interface DriverConfigurations {
        'smtp': SmtpDriverConfig;
    }
}

export interface SmtpDriverConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
        user: string;
        pass: string;
    };
    timeout?: number;
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
}

export interface EmailMessage {
    to: string | string[];
    from?: string;
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

export interface SmtpResponse {
    messageId: string;
    accepted: string[];
    rejected: string[];
    pending: string[];
    response: string;
}

/**
 * Driver SMTP préconçu pour l'envoi d'emails
 * Utilisé par les providers email pour envoyer des messages
 */
@Injectable()
export class SmtpDriver {
    private readonly logger = new Logger(SmtpDriver.name);
    private transporter: Transporter;
    private isConnected = false;

    constructor(private readonly config: SmtpDriverConfig) {
        this.initializeTransporter();
    }

    /**
     * Initialise le transporteur SMTP
     */
    private initializeTransporter(): void {
        this.transporter = createTransport({
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure || false,
            auth: this.config.auth,
            connectionTimeout: this.config.timeout || 10000,
            greetingTimeout: this.config.timeout || 10000,
            socketTimeout: this.config.timeout || 10000,
            pool: this.config.pool || false,
            maxConnections: this.config.maxConnections || 5,
            maxMessages: this.config.maxMessages || 100
        } as any);

        this.transporter.on('error', (error) => {
            this.logger.error(`SMTP transporter error: ${error.message}`);
            this.isConnected = false;
        });
    }

    /**
     * Envoie un email
     */
    async send(message: EmailMessage): Promise<SmtpResponse> {
        const startTime = Date.now();

        try {
            // Vérifier la connexion si nécessaire
            if (!this.isConnected) {
                await this.verifyConnection();
            }

            this.logger.debug(`Sending email to ${Array.isArray(message.to) ? message.to.join(', ') : message.to}`);

            const mailOptions: SendMailOptions = {
                from: message.from || this.config.auth.user,
                to: message.to,
                subject: message.subject,
                text: message.text,
                html: message.html,
                cc: message.cc,
                bcc: message.bcc,
                attachments: message.attachments
            };

            const info = await this.transporter.sendMail(mailOptions);
            const duration = Date.now() - startTime;

            this.logger.debug(`Email sent successfully in ${duration}ms. MessageId: ${info.messageId}`);

            return {
                messageId: info.messageId,
                accepted: info.accepted || [],
                rejected: info.rejected || [],
                pending: info.pending || [],
                response: info.response || ''
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Failed to send email after ${duration}ms: ${error.message}`);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Envoie un email simple (méthode de convenance)
     */
    async sendSimple(to: string, subject: string, body: string, isHtml = false): Promise<SmtpResponse> {
        const message: EmailMessage = {
            to,
            subject,
            ...(isHtml ? { html: body } : { text: body })
        };

        return this.send(message);
    }

    /**
     * Vérifie la connexion SMTP
     */
    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            this.isConnected = true;
            this.logger.debug('SMTP connection verified successfully');
            return true;
        } catch (error) {
            this.isConnected = false;
            this.logger.error(`SMTP connection verification failed: ${error.message}`);
            throw new Error(`SMTP connection failed: ${error.message}`);
        }
    }

    /**
     * Vérifie la santé du driver
     */
    async healthCheck(): Promise<boolean> {
        try {
            return await this.verifyConnection();
        } catch (error) {
            this.logger.warn(`SMTP driver health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Ferme la connexion SMTP
     */
    async close(): Promise<void> {
        if (this.transporter) {
            this.transporter.close();
            this.isConnected = false;
            this.logger.debug('SMTP connection closed');
        }
    }

    /**
     * Obtient les informations de configuration (sans les credentials)
     */
    getConfigInfo(): Partial<SmtpDriverConfig> {
        return {
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure,
            timeout: this.config.timeout,
            pool: this.config.pool,
            maxConnections: this.config.maxConnections,
            maxMessages: this.config.maxMessages
        };
    }
}