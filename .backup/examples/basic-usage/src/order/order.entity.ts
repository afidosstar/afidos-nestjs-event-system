import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    customerId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'customerId' })
    customer: User;

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ default: 'USD' })
    currency: string;

    @Column('jsonb')
    items: OrderItem[];

    @Column({ default: 'pending' })
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

    @Column({ nullable: true })
    trackingNumber?: string;

    @Column({ nullable: true })
    carrier?: string;

    @Column({ nullable: true })
    estimatedDelivery?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

interface OrderItem {
    productId: string;
    name: string;
    quantity: number;
    price: number;
}
