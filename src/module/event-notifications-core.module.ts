import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventType, EventRecipient, EventLog } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventType, EventRecipient, EventLog])
  ],
  exports: [TypeOrmModule]
})
export class EventNotificationsCoreModule {}
