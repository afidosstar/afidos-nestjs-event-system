import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';

/**
 * Entité pour stocker les statistiques agrégées
 */
@Entity('event_stats')
@Index(['eventType', 'date'], { unique: true })
@Index(['date'])
export class EventStatsEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    eventType: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'integer', default: 0 })
    totalEvents: number;

    @Column({ type: 'integer', default: 0 })
    syncEvents: number;

    @Column({ type: 'integer', default: 0 })
    asyncEvents: number;

    @Column({ type: 'integer', default: 0 })
    successfulEvents: number;

    @Column({ type: 'integer', default: 0 })
    failedEvents: number;

    @Column({ type: 'float', default: 0 })
    averageProcessingTime: number;

    @Column({ type: 'float', default: 0 })
    minProcessingTime: number;

    @Column({ type: 'float', default: 0 })
    maxProcessingTime: number;

    @Column({ type: 'json', nullable: true })
    channelStats: Record<string, {
        total: number;
        successful: number;
        failed: number;
        averageLatency: number;
    }>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
