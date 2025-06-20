import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventType } from './entities/event-type.entity';
import { User } from './user/user.entity';
import { Order } from './order/order.entity';
import { SyncEventsCommand } from './commands/sync-events.command';

/**
 * Module dédié aux commandes CLI
 * Configuration minimale pour les commandes sans démarrer l'application complète
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRoot({
            type: 'sqlite',
            database: 'db.sqlite',
            entities: [User, Order, EventType],
            synchronize: process.env.NODE_ENV === 'development',
            logging: false // Désactiver les logs SQL pour les commandes
        }),
        TypeOrmModule.forFeature([EventType])
    ],
    providers: [SyncEventsCommand]
})
export class CliModule {}