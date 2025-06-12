import {NotificationChannel} from "@/config";
import {NotificationResult} from "@/types";

export interface RecipientConfig {
    recipientType: 'user' | 'role' | 'group' | 'email' | 'phone' | 'webhook' | 'external';
    recipientId: string;
    config: Record<string, any>;
  }

  export interface NotificationProvider {
    readonly name: string;
    readonly channel: NotificationChannel;

    send(payload: any, recipient: RecipientConfig): Promise<NotificationResult>;
    validateConfig(config: any): boolean;
    healthCheck(): Promise<boolean>;
  }
