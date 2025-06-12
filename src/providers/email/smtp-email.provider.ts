import { Injectable } from '@nestjs/common';
import {NotificationProvider, RecipientConfig} from '../base/notification-provider.interface';
import * as nodemailer from 'nodemailer';
import {NotificationChannel} from "@/config";
import {NotificationResult} from "@/types";

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

@Injectable()
export class SmtpEmailProvider implements NotificationProvider {
  readonly name = 'smtp';
  readonly channel: NotificationChannel = 'email';
  private transporter: nodemailer.Transporter;

  constructor(private config: SmtpConfig) {
    this.transporter = nodemailer.createTransport(this.config);
  }

  async send(payload: any, recipient: RecipientConfig): Promise<NotificationResult> {
    try {
      const mailOptions = {
        from: this.config.auth.user,
        to: recipient.recipientId,
        subject: payload.subject || 'Notification',
        html: payload.html || JSON.stringify(payload),
      };

      const info = await this.transporter.sendMail(mailOptions);

      return {
        channel: this.channel,
        status: 'sent',
        externalId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error:any) {
      return {
        channel: this.channel,
        status: 'failed',
        message: error.message,
        timestamp: new Date(),
      };
    }
  }

  validateConfig(config: any): boolean {
    return !!(config.host && config.port && config.auth?.user && config.auth?.pass);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
