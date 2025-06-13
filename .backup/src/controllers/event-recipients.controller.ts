import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {DeepPartial, Repository} from 'typeorm';
import { EventRecipient } from '../entities/event-recipient.entity';
import { CreateEventRecipientDto, UpdateEventRecipientDto } from '../dto/event-recipient.dto';

@Controller('recipients')
export class EventRecipientsController {
  constructor(
    @InjectRepository(EventRecipient)
    private eventRecipientRepository: Repository<EventRecipient>,
  ) {}

  @Get()
  async findAll(
    @Query('eventType') eventType?: string,
    @Query('channel') channel?: string,
    @Query('enabled') enabled?: boolean
  ) {
    const where: any = {};
    if (eventType) where.eventTypeName = eventType;
    if (channel) where.channel = channel;
    if (enabled !== undefined) where.enabled = enabled;

    return this.eventRecipientRepository.find({ where });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventRecipientRepository.findOne({ where: { id } });
  }

  @Post()
  async create(@Body() createDto: CreateEventRecipientDto) {
    const recipient = this.eventRecipientRepository.create(createDto as  DeepPartial<EventRecipient>);
    return this.eventRecipientRepository.save(recipient);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateEventRecipientDto) {
    await this.eventRecipientRepository.update(id, updateDto as  DeepPartial<EventRecipient>) ;
    return this.eventRecipientRepository.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.eventRecipientRepository.delete(id);
    return { message: 'Event recipient deleted successfully' };
  }

  @Post('bulk')
  async createBulk(@Body() createDtos: CreateEventRecipientDto[]) {
    const recipients = this.eventRecipientRepository.create(createDtos as  DeepPartial<EventRecipient>);
    return this.eventRecipientRepository.save(recipients);
  }

  @Get('by-event/:eventType')
  async findByEventType(@Param('eventType') eventType: string) {
    return this.eventRecipientRepository.find({
      where: { eventTypeName: eventType, enabled: true }
    });
  }
}
