import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { createTemplateHelpers } from './helpers';

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
                template: {
                    dir: join(__dirname, 'templates'),
                    adapter: new HandlebarsAdapter(),
                    options: {
                        strict: true,
                    },
                },
            }),
        }),
    ],
    exports: [MailerModule],
})
export class CustomMailerModule {
    constructor() {
        // Enregistrer les helpers Handlebars au démarrage
        this.registerHandlebarsHelpers();
    }

    private registerHandlebarsHelpers() {
        const helpers = createTemplateHelpers();
        const handlebars = require('handlebars');

        // Enregistrer tous les helpers
        Object.entries(helpers).forEach(([name, helper]) => {
            handlebars.registerHelper(name, helper);
        });

        // Helper conditionnel personnalisé
        handlebars.registerHelper('if', function(conditional, options) {
            if (conditional) {
                return options.fn(this);
            } else {
                return options.inverse ? options.inverse(this) : '';
            }
        });

        // Helper de boucle personnalisé
        handlebars.registerHelper('each', function(context, options) {
            if (!Array.isArray(context)) return '';
            
            return context.map(item => {
                return options.fn(item);
            }).join('');
        });

        // Helper pour les propriétés d'objet
        handlebars.registerHelper('get', function(obj, key) {
            return obj && obj[key] ? obj[key] : '';
        });
    }
}