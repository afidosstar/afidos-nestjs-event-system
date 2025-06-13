import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {NotificationChannel} from "../config";

@Entity('event_recipients')
export class EventRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventTypeName: string;

  @Column()
  channel: NotificationChannel;

  @Column()
  recipientType: 'user' | 'role' | 'group' | 'email' | 'phone' | 'webhook' | 'external';

  @Column()
  recipientId: string;

  @Column('jsonb')
  config: Record<string, any>;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

