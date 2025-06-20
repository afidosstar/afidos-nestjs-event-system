import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventType } from '../entities/event-type.entity';
import { SyncEventsCommand } from './sync-events.command';

@Module({
    imports: [
        TypeOrmModule.forFeature([EventType])
    ],
    providers: [SyncEventsCommand],
    exports: [SyncEventsCommand]
})
export class CommandsModule {}