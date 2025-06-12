import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import {FieldSchema, NotificationChannel, RateLimitConfig, RetryPolicy} from "@/config";

@Entity('event_types')
export class EventType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column('jsonb')
  schema: Record<string, FieldSchema>;

  @Column('simple-array')
  channels: NotificationChannel[];

  @Column({ default: 'async' })
  defaultProcessing: 'sync' | 'async';

  @Column({ default: false })
  waitForResult: boolean;

  @Column('jsonb', { nullable: true })
  templates?: Record<string, string>;

  @Column('jsonb', { nullable: true })
  retryPolicy?: RetryPolicy;

  @Column('jsonb', { nullable: true })
  rateLimiting?: RateLimitConfig;

  @Column({ default: 'normal' })
  priority: 'low' | 'normal' | 'high';

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
