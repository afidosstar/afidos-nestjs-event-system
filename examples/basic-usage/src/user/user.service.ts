import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
      @InjectRepository(User)
      private userRepository: Repository<User>,
      private eventEmitter: EventEmitterService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Create user
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    // Emit user.created event with type safety
    await this.eventEmitter.emit('user.created', {
      userId: savedUser.id,
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      registrationSource: savedUser.registrationSource,
    });

    return savedUser;
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findByEmail(email);

    // Generate reset token (simplified)
    const resetToken = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Emit password reset event - processed synchronously for security
    const result = await this.eventEmitter.emit('user.password.reset', {
      userId: user.id,
      email: user.email,
      resetToken,
      expiresAt,
    }, {
      waitForResult: true,
      timeout: 10000,
    });

    if (!result.results?.every(r => r.status === 'sent')) {
      throw new Error('Failed to send password reset email');
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}
