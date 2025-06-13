import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { Order } from './order.entity';
import { User } from '../user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class OrderService {
    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        private userService: UserService,
        private eventEmitter: EventEmitterService,
    ) {}

    async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
        // Validate customer exists
        const customer = await this.userService.findById(createOrderDto.customerId);

        // Calculate total amount
        const totalAmount = createOrderDto.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order
        const order = this.orderRepository.create({
            ...createOrderDto,
            totalAmount,
            currency: createOrderDto.currency || 'USD',
            status: 'pending',
        });

        const savedOrder = await this.orderRepository.save(order);

        // Emit order.created event
        await this.eventEmitter.emit('order.created', {
            orderId: savedOrder.id,
            customerId: savedOrder.customerId,
            customerEmail: customer.email,
            totalAmount: savedOrder.totalAmount,
            currency: savedOrder.currency,
            items: savedOrder.items,
        });

        return savedOrder;
    }

    async findById(id: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id },
            relations: ['customer'],
        });

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }

        return order;
    }

    async shipOrder(id: string, trackingNumber: string, carrier: string): Promise<Order> {
        const order = await this.findById(id);

        if (order.status !== 'confirmed') {
            throw new Error('Order must be confirmed before shipping');
        }

        // Update order
        order.status = 'shipped';
        order.trackingNumber = trackingNumber;
        order.carrier = carrier;
        order.estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const updatedOrder = await this.orderRepository.save(order);

        // Emit shipping event
        await this.eventEmitter.emit('order.shipped', {
            orderId: updatedOrder.id,
            customerId: updatedOrder.customerId,
            trackingNumber: updatedOrder.trackingNumber,
            carrier: updatedOrder.carrier,
            estimatedDelivery: updatedOrder.estimatedDelivery,
        });

        return updatedOrder;
    }

    async confirmOrder(id: string): Promise<Order> {
        const order = await this.findById(id);
        order.status = 'confirmed';
        return this.orderRepository.save(order);
    }

    async processPayment(orderId: string, paymentMethod: string): Promise<{ success: boolean; paymentId: string }> {
        const order = await this.findById(id);

        // Simulate payment processing
        const paymentId = `pay_${Math.random().toString(36).substring(2, 15)}`;
        const success = Math.random() > 0.1; // 90% success rate

        if (success) {
            // Emit payment success event with result waiting
            const result = await this.eventEmitter.emit('payment.completed', {
                paymentId,
                orderId: order.id,
                customerId: order.customerId,
                amount: order.totalAmount,
                method: paymentMethod,
            }, {
                waitForResult: true,
                timeout: 30000,
            });

            // Check if notifications were sent successfully
            const notificationsFailed = result.results?.some(r => r.status === 'failed');
            if (notificationsFailed) {
                console.warn(`Some notifications failed for payment ${paymentId}`);
            }

            return { success: true, paymentId };
        } else {
            // Emit payment failure event
            await this.eventEmitter.emit('payment.failed', {
                paymentId,
                orderId: order.id,
                customerId: order.customerId,
                amount: order.totalAmount,
                failureReason: 'Insufficient funds',
            });

            return { success: false, paymentId };
        }
    }
}
