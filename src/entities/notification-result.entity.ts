import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import {EventLogEntity} from "./event-log.entity";
import {NotificationChannel} from "@/types/interfaces";

/**
 * Entité pour stocker les résultats détaillés des notifications
 */
@Entity('notification_results')
@Index(['eventLogId'])
@Index(['channel'])
@Index(['provider'])
@Index(['status'])
@Index(['sentAt'])
export class NotificationResultEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    eventLogId: string;

    @Column({ type: 'varchar', length: 255 })
    correlationId: string;

    @Column({
        type: 'enum',
        enum: ['email', 'sms', 'webhook', 'push', 'external-service']
    })
    channel: NotificationChannel;

    @Column({ type: 'varchar', length: 255 })
    provider: string;

    @Column({
        type: 'enum',
        enum: ['sent', 'failed', 'pending', 'retrying']
    })
    status: 'sent' | 'failed' | 'pending' | 'retrying';

    @Column({ type: 'text', nullable: true })
    error: string;

    @Column({ type: 'timestamp', nullable: true })
    sentAt: Date;

    @Column({ type: 'integer', default: 1 })
    attempts: number;

    @Column({ type: 'timestamp', nullable: true })
    nextRetryAt: Date;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    // Relation avec EventLog
    @ManyToOne(() => EventLogEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'eventLogId' })
    eventLog: EventLogEntity;
}
