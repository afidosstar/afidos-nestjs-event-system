import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto) {
        const order = await this.orderService.createOrder(createOrderDto);
        return {
            message: 'Order created successfully',
            order: {
                id: order.id,
                customerId: order.customerId,
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                items: order.items,
            },
        };
    }

    @Get(':id')
    async getOrder(@Param('id') id: string) {
        const order = await this.orderService.findById(id);
        return {
            order: {
                id: order.id,
                customerId: order.customerId,
                totalAmount: order.totalAmount,
                currency: order.currency,
                status: order.status,
                items: order.items,
                trackingNumber: order.trackingNumber,
                carrier: order.carrier,
                estimatedDelivery: order.estimatedDelivery,
                createdAt: order.createdAt,
            },
        };
    }

    @Patch(':id/confirm')
    async confirmOrder(@Param('id') id: string) {
        const order = await this.orderService.confirmOrder(id);
        return {
            message: 'Order confirmed successfully',
            order: { id: order.id, status: order.status },
        };
    }

    @Patch(':id/ship')
    async shipOrder(
        @Param('id') id: string,
        @Body() body: { trackingNumber: string; carrier: string }
    ) {
        const order = await this.orderService.shipOrder(id, body.trackingNumber, body.carrier);
        return {
            message: 'Order shipped successfully',
            order: {
                id: order.id,
                status: order.status,
                trackingNumber: order.trackingNumber,
                carrier: order.carrier,
                estimatedDelivery: order.estimatedDelivery,
            },
        };
    }

    @Post(':id/payment')
    async processPayment(
        @Param('id') id: string,
        @Body() body: { paymentMethod: string }
    ) {
        const result = await this.orderService.processPayment(id, body.paymentMethod);
        return {
            message: result.success ? 'Payment processed successfully' : 'Payment failed',
            payment: result,
        };
    }
}
