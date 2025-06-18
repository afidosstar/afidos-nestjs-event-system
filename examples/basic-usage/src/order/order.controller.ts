import {Controller, Post, Body, Get, Param, Put, HttpStatus, HttpException} from '@nestjs/common';
import {OrderService} from './order.service';

interface CreateOrderDto {
    customerId: number;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
}

interface CompleteOrderDto {
    paymentMethod: string;
}

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {
    }

    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto) {
        try {
            const order = await this.orderService.createOrder(createOrderDto);
            return {
                success: true,
                data: order,
                message: 'Order created successfully. Notifications will be sent.'
            };
        } catch (error) {
            throw new HttpException(
                {success: false, message: error.message},
                HttpStatus.BAD_REQUEST
            );
        }
    }

    @Put(':id/complete')
    async completeOrder(
        @Param('id') id: string,
        @Body() completeOrderDto: CompleteOrderDto
    ) {
        try {
            const result = await this.orderService.completeOrder({
                orderId: id,
                paymentMethod: completeOrderDto.paymentMethod
            });

            return {
                success: true,
                data: result,
                message: 'Order completed and shipped successfully'
            };
        } catch (error) {
            throw new HttpException(
                {success: false, message: error.message},
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get(':id')
    async getOrder(@Param('id') id: string) {
        try {
            const order = await this.orderService.findById(id);
            if (!order) {
                throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: order
            };
        } catch (error) {
            throw new HttpException(
                {success: false, message: error.message},
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
