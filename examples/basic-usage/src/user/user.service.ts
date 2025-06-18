import {Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {EventEmitterService} from '@afidos/nestjs-event-notifications';
import {User} from './user.entity';
import {MyAppEvents} from '../config';

interface CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private eventEmitter: EventEmitterService<MyAppEvents>
    ) {
    }

    async createUser(createUserDto: CreateUserDto): Promise<User> {
        try {
            // Vérifier si l'utilisateur existe déjà
            const existingUser = await this.userRepository.findOne({
                where: {email: createUserDto.email}
            });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Créer l'utilisateur
            const user = this.userRepository.create({
                email: createUserDto.email,
                firstName: createUserDto.firstName,
                lastName: createUserDto.lastName,
                passwordHash: await this.hashPassword(createUserDto.password)
            });

            const savedUser = await this.userRepository.save(user);
            this.logger.log(`User created: ${savedUser.id}`);

            // Émettre l'événement de création d'utilisateur (async)
            await this.eventEmitter.emitAsync('user.created', {
                id: savedUser.id,
                email: savedUser.email,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName
            });

            return savedUser;

        } catch (error) {
            this.logger.error('Failed to create user', {
                email: createUserDto.email,
                error: error.message
            });
            throw error;
        }
    }

    async updateUser(id: number, updateData: Partial<User>): Promise<User | null> {
        try {
            const user = await this.userRepository.findOne({where: {id}});
            if (!user) {
                return null;
            }

            Object.assign(user, updateData);
            const savedUser = await this.userRepository.save(user);

            // Émettre l'événement de mise à jour d'utilisateur (async)
            await this.eventEmitter.emitAsync('user.updated', {
                id: savedUser.id,
                email: savedUser.email,
                firstName: savedUser.firstName,
                lastName: savedUser.lastName
            });

            return savedUser;

        } catch (error) {
            this.logger.error('Failed to update user', {
                id,
                error: error.message
            });
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({where: {id}});
    }

    private async hashPassword(password: string): Promise<string> {
        // Implémentation simple pour l'exemple (utiliser bcrypt en production)
        return `hashed_${password}`;
    }

}
