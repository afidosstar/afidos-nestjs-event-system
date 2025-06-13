import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index
} from 'typeorm';
import { NotificationChannel, ProcessingMode, EventPriority } from '../types/interfaces';

/**
 * Entité pour stocker la configuration des types d'événements
 */
@Entity('event_types')
@Index(['name'], { unique: true })
export class EventTypeEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'json' })
    channels: NotificationChannel[];

    @Column({
        type: 'enum',
        enum: ['sync', 'async'],
        default: 'async'
    })
    defaultProcessing: ProcessingMode;

    @Column({ type: 'boolean', default: false })
    waitForResult: boolean;

    @Column({ type: 'integer', default: 3 })
    retryAttempts: number;

    @Column({
        type: 'enum',
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    })
    priority: EventPriority;

    @Column({ type: 'integer', nullable: true })
    delay: number;

    @Column({ type: 'integer', default: 30000 })
    timeout: number;

    @Column({ type: 'json', nullable: true })
    schema: Record<string, any>;

    @Column({ type: 'json', nullable: true })
    templates: Record<string, string>;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    createdBy: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    updatedBy: string;
}
