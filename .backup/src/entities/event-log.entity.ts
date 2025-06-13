import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

@Entity('event_logs')
export class EventLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    eventType: string ;

    @Column('jsonb')
    payload: Record<string, any>;

    @Column()
    correlationId: string;

    @Column()
    mode: 'sync' | 'async' | 'auto';

    @Column({ default: 'pending' })
    status: 'pending' | 'processing' | 'completed' | 'failed';

    @Column('jsonb', { nullable: true })
    results?: any[];

    @Column('jsonb', { nullable: true })
    error?: Record<string, any>;

    @Column({ nullable: true })
    queuedAt?: Date;

    @Column({ nullable: true })
    processedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
