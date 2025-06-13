import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';
import {NotificationChannel} from "@/types/interfaces";

/**
 * Entité pour tracker la santé des providers
 */
@Entity('provider_health')
@Index(['channel', 'provider'], { unique: true })
@Index(['isHealthy'])
@Index(['lastCheckAt'])
export class ProviderHealthEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: ['email', 'sms', 'webhook', 'push', 'external-service']
    })
    channel: NotificationChannel;

    @Column({ type: 'varchar', length: 255 })
    provider: string;

    @Column({ type: 'boolean', default: true })
    isHealthy: boolean;

    @Column({ type: 'timestamp' })
    lastCheckAt: Date;

    @Column({ type: 'text', nullable: true })
    lastError: string;

    @Column({ type: 'integer', default: 0 })
    consecutiveFailures: number;

    @Column({ type: 'integer', default: 0 })
    totalChecks: number;

    @Column({ type: 'integer', default: 0 })
    successfulChecks: number;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
