import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../entities/event-type.entity';

@Controller('event-types')
export class EventTypesController {
  constructor(
    @InjectRepository(EventType)
    private eventTypeRepository: Repository<EventType>,
  ) {}

  @Get()
  async findAll(@Query('enabled') enabled?: boolean) {
    const where = enabled !== undefined ? { enabled } : {};
    return this.eventTypeRepository.find({ where });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventTypeRepository.findOne({ where: { id } });
  }

  @Post()
  async create(@Body() createEventTypeDto: Partial<EventType>) {
    return this.eventTypeRepository.save(createEventTypeDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateEventTypeDto: Partial<EventType>) {
    await this.eventTypeRepository.update(id, updateEventTypeDto);
    return this.eventTypeRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.eventTypeRepository.delete(id);
    return { message: 'Event type deleted successfully' };
  }
}
