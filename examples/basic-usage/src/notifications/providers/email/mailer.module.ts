import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import {TypeOrmModule} from "@nestjs/typeorm";
import {EventType} from "../../../entities/event-type.entity";
import {EmailProvider} from "./email.provider";
import {EmailTemplateProvider} from "../../template-providers/email-template.provider";
import {ConfigService} from "@nestjs/config";
import * as process from "node:process";

/**
 * Module simple pour la configuration SMTP
 */
@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: (configService: ConfigService) => {
                console.log('commentaire',{
                    transport: {
                        host: configService.get('SMTP_HOST','localhost'),
                        port: configService.get<number>('SMTP_PORT',587),
                        secure: configService.get('SMTP_SECURE','false') === 'true',
                        auth: {
                            user: configService.get('SMTP_USER',''),
                            pass: configService.get('SMTP_PASSWORD', ''),
                        },
                    },
                    defaults: {
                        from: configService.get('SMTP_FROM','noreply@example.com'),
                    },
                },process.cwd())
                return {
                    transport: {
                        host: configService.get('SMTP_HOST','localhost'),
                        port: configService.get<number>('SMTP_PORT',587),
                        secure: configService.get('SMTP_SECURE','false') === 'true',
                        auth: {
                            user: configService.get('SMTP_USER',''),
                            pass: configService.get('SMTP_PASSWORD', ''),
                        },
                    },
                    defaults: {
                        from: configService.get('SMTP_FROM','noreply@example.com'),
                    },
                }
            },
            inject: [ConfigService]
        }),
        TypeOrmModule.forFeature([EventType])
    ],
    providers:[EmailProvider,EmailTemplateProvider],
    exports: [EmailProvider,EmailTemplateProvider],
})
export class CustomMailerModule {}
