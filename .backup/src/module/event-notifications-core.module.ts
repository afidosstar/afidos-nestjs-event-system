import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventTypeEntity, EventRecipient, EventLog } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventTypeEntity, EventRecipient, EventLog])
  ],
  exports: [TypeOrmModule]
})
export class EventNotificationsCoreModule {}
