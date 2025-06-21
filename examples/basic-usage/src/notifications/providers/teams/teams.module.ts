import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamsProvider } from './teams.provider';
import { TeamsTemplateProvider } from '../../template-providers/teams-template.provider';
import { EventType } from '../../../entities/event-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EventType])
  ],
  providers: [
    TeamsProvider,
    TeamsTemplateProvider
  ],
  exports: [
    TeamsProvider,
    TeamsTemplateProvider
  ]
})
export class TeamsModule {}