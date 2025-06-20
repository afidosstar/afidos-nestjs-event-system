import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/**
 * Entité pour stocker les types d'événements synchronisés
 */
@Entity('event_types')
export class EventType {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    subject: string;

    @Column({ type: 'json', nullable: true })
    channels: string[];

    @Column({ default: 'async' })
    defaultProcessing: string;

    @Column({ default: false })
    waitForResult: boolean;

    @Column({ default: 3 })
    retryAttempts: number;

    @Column({ default: 'normal' })
    priority: string;

    @Column({ nullable: true })
    timeout: number;

    @Column({ default: true })
    enabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @DeleteDateColumn()
    deletedAt: Date;
}