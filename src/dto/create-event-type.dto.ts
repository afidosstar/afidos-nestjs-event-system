import { IsString, IsObject, IsArray, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { FieldSchema, NotificationChannel, RetryPolicy, RateLimitConfig } from '../config/event-config.interface';

export class CreateEventTypeDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsObject()
  schema: Record<string, FieldSchema>;

  @IsArray()
  @IsEnum(['email', 'sms', 'push', 'webhook', 'external-service', 'realtime'], { each: true })
  channels: NotificationChannel[];

  @IsEnum(['sync', 'async'])
  defaultProcessing: 'sync' | 'async';

  @IsBoolean()
  waitForResult: boolean;

  @IsOptional()
  @IsObject()
  templates?: Record<string, string>;

  @IsOptional()
  @IsObject()
  retryPolicy?: RetryPolicy;

  @IsOptional()
  @IsObject()
  rateLimiting?: RateLimitConfig;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: 'low' | 'normal' | 'high';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}