import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {EventEmitterService} from '@afidos/nestjs-event-notifications';
import {Order} from './order.entity';
import {MyAppEvents} from '../config';

interface CreateOrderDto {
    customerId: number;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
}

interface CompleteOrderDto {
    orderId: string;
    paymentMethod: string;
}

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        private eventEmitter: EventEmitterService<MyAppEvents>
    ) {
    }

    async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
        try {
            const amount = createOrderDto.items.reduce(
                (total, item) => total + (item.price * item.quantity),
                0
            );

            const order = this.orderRepository.create({
                customerId: createOrderDto.customerId,
                amount,
                items: createOrderDto.items,
                status: 'pending'
            });

            const savedOrder = await this.orderRepository.save(order);

            // Émettre l'événement de création (async)
            await this.eventEmitter.emitAsync('order.created', {
                id: savedOrder.id,
                userId: savedOrder.customerId,
                customerEmail: `customer${savedOrder.customerId}@example.com`, // Mock data
                customerName: `Customer ${savedOrder.customerId}`,
                total: savedOrder.amount,
                items: createOrderDto.items
            });

            this.logger.log(`Order created: ${savedOrder.id}`);
            return savedOrder;

        } catch (error) {
            this.logger.error('Failed to create order', {
                customerId: createOrderDto.customerId,
                error: error.message
            });
            throw error;
        }
    }

    async completeOrder(completeOrderDto: CompleteOrderDto): Promise<Order> {
        try {
            const order = await this.orderRepository.findOne({
                where: {id: completeOrderDto.orderId}
            });

            if (!order) {
                throw new Error(`Order not found: ${completeOrderDto.orderId}`);
            }

            // Mettre à jour le statut de la commande
            order.status = 'completed';
            order.paymentMethod = completeOrderDto.paymentMethod;
            order.completedAt = new Date();

            const savedOrder = await this.orderRepository.save(order);

            // Émettre l'événement d'expédition (async)
            await this.eventEmitter.emitAsync('order.shipped', {
                id: savedOrder.id,
                userId: savedOrder.customerId,
                customerEmail: `customer${savedOrder.customerId}@example.com`, // Mock data
                customerName: `Customer ${savedOrder.customerId}`,
                trackingNumber: `TRK${Date.now()}`
            });

            this.logger.log(`Order completed and shipped: ${savedOrder.id}`);

            return savedOrder;

        } catch (error) {
            this.logger.error('Failed to complete order', {
                orderId: completeOrderDto.orderId,
                error: error.message
            });
            throw error;
        }
    }

    async findById(id: string): Promise<Order | null> {
        return this.orderRepository.findOne({where: {id}});
    }
}
