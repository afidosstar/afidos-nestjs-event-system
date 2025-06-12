import { IsString, IsEnum, IsBoolean, IsObject, IsOptional } from 'class-validator';
import { NotificationChannel } from '../config/event-config.interface';

export class CreateEventRecipientDto {
  @IsString()
  eventTypeName: string;

  @IsEnum(['email', 'sms', 'push', 'webhook', 'external-service', 'realtime'])
  channel: NotificationChannel;

  @IsEnum(['user', 'role', 'group', 'email', 'phone', 'webhook', 'external'])
  recipientType: string;

  @IsString()
  recipientId: string;

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateEventRecipientDto {
  @IsOptional()
  @IsString()
  eventTypeName?: string;

  @IsOptional()
  @IsEnum(['email', 'sms', 'push', 'webhook', 'external-service', 'realtime'])
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(['user', 'role', 'group', 'email', 'phone', 'webhook', 'external'])
  recipientType?: string;

  @IsOptional()
  @IsString()
  recipientId?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}