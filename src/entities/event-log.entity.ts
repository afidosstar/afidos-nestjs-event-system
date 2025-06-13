import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import {ProcessingMode} from "@/types/interfaces";
import {EventTypeEntity} from "./event-type.entity";

/**
 * Entité pour logger les événements émis
 */
@Entity('event_logs')
@Index(['eventType'])
@Index(['correlationId'])
@Index(['status'])
@Index(['createdAt'])
export class EventLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    eventId: string;

    @Column({ type: 'varchar', length: 255 })
    eventType: string;

    @Column({ type: 'varchar', length: 255 })
    correlationId: string;

    @Column({ type: 'json' })
    payload: any;

    @Column({
        type: 'enum',
        enum: ['sync', 'async']
    })
    mode: ProcessingMode;

    @Column({
        type: 'enum',
        enum: ['pending', 'processing', 'completed', 'failed', 'timeout'],
        default: 'pending'
    })
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';

    @Column({ type: 'boolean', default: false })
    waitedForResult: boolean;

    @Column({ type: 'json', nullable: true })
    results: any[];

    @Column({ type: 'timestamp', nullable: true })
    queuedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    processedAt: Date;

    @Column({ type: 'integer', nullable: true })
    processingDuration: number;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @Column({ type: 'json', nullable: true })
    errorDetails: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    // Relation optionnelle avec EventType
    @ManyToOne(() => EventTypeEntity, { nullable: true })
    @JoinColumn({ name: 'eventType', referencedColumnName: 'name' })
    eventTypeEntity: EventTypeEntity;
}
