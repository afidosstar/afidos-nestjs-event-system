import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn} from 'typeorm';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    customerId: number;

    @Column('decimal', {precision: 10, scale: 2})
    amount: number;

    @Column('json')
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;

    @Column({default: 'pending'})
    status: string;

    @Column({nullable: true})
    paymentMethod: string;

    @Column({ nullable: true})
    completedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
