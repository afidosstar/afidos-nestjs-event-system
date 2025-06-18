import {Module} from "@nestjs/common";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Order} from "./order.entity";
import {OrderService} from "./order.service";
import {OrderController} from "./order.controller";

@Module({
    controllers: [OrderController],
    imports: [
        // Configuration TypeORM
        TypeOrmModule.forFeature([
            Order
        ]),

    ],
    providers: [ OrderService],
    exports: [ OrderService]
})
export class OrderModule {}
