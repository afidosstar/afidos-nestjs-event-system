// examples/basic-usage/package.json
{
    "name": "basic-usage-example",
    "version": "1.0.0",
    "private": true,
    "scripts": {
    "start": "ts-node src/main.ts",
        "start:dev": "nodemon --exec ts-node src/main.ts",
        "build": "tsc",
        "test": "jest"
},
    "dependencies": {
    "@nestjs/common": "^10.0.0",
        "@nestjs/core": "^10.0.0",
        "@nestjs/platform-express": "^10.0.0",
        "@nestjs/typeorm": "^10.0.0",
        "@nestjs/bull": "^10.0.0",
        "typeorm": "^0.3.0",
        "pg": "^8.11.0",
        "bull": "^4.10.0",
        "redis": "^4.6.0",
        "reflect-metadata": "^0.1.13",
        "rxjs": "^7.8.0",
        "@afidos/nestjs-event-notifications": "file:../../"
},
    "devDependencies": {
    "@types/node": "^20.0.0",
        "typescript": "^5.0.0",
        "ts-node": "^10.9.0",
        "nodemon": "^3.0.0"
}
}

// examples/basic-usage/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    try {
        const app = await NestFactory.create(AppModule);

        // Configuration CORS si nécessaire
        app.enableCors();

        const port = process.env.PORT || 3000;
        await app.listen(port);

        logger.log(`🚀 Application is running on: http://localhost:${port}`);
        logger.log(`📊 Health check: http://localhost:${port}/health`);
        logger.log(`📝 Example endpoints: http://localhost:${port}/users`);

    } catch (error) {
        logger.error('❌ Failed to start application', error);
        process.exit(1);
    }
}

bootstrap();

// examples/basic-usage/src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    passwordHash: string;

    @Column({ nullable: true })
    resetToken: string;

    @Column({ type: 'timestamp', nullable: true })
    resetTokenExpiry: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// examples/basic-usage/src/entities/order.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    customerId: number;

    @Column('decimal', { precision: 10, scale: 2 })
    amount: number;

    @Column('json')
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;

    @Column({ default: 'pending' })
    status: string;

    @Column({ nullable: true })
    paymentMethod: string;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// examples/basic-usage/src/controllers/user.controller.ts
import { Controller, Post, Body, Get, Param, HttpStatus, HttpException } from '@nestjs/common';
import { UserService } from '../services/user.service';

interface CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

interface PasswordResetDto {
    email: string;
}

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    async createUser(@Body() createUserDto: CreateUserDto) {
        try {
            const user = await this.userService.createUser(createUserDto);
            return {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                },
                message: 'User created successfully. Welcome email will be sent shortly.'
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: error.message },
                HttpStatus.BAD_REQUEST
            );
        }
    }

    @Post('password-reset')
    async requestPasswordReset(@Body() passwordResetDto: PasswordResetDto) {
        try {
            const result = await this.userService.requestPasswordReset(passwordResetDto.email);

            if (result.success) {
                return {
                    success: true,
                    message: 'Password reset email sent successfully'
                };
            } else {
                return {
                    success: false,
                    message: 'User not found or email could not be sent'
                };
            }
        } catch (error) {
            throw new HttpException(
                { success: false, message: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get(':id')
    async getUser(@Param('id') id: string) {
        try {
            const user = await this.userService.findById(parseInt(id));
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

// examples/basic-usage/src/controllers/order.controller.ts
import { Controller, Post, Body, Get, Param, Put, HttpStatus, HttpException } from '@nestjs/common';
import { OrderService } from '../services/order.service';

interface CreateOrderDto {
    customerId: number;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
}

interface CompleteOrderDto {
    paymentMethod: string;
}

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto) {
        try {
            const order = await this.orderService.createOrder(createOrderDto);
            return {
                success: true,
                data: order,
                message: 'Order created successfully. Notifications will be sent.'
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: error.message },
                HttpStatus.BAD_REQUEST
            );
        }
    }

    @Put(':id/complete')
    async completeOrder(
        @Param('id') id: string,
        @Body() completeOrderDto: CompleteOrderDto
    ) {
        try {
            const result = await this.orderService.completeOrder({
                orderId: id,
                paymentMethod: completeOrderDto.paymentMethod
            });

            return {
                success: true,
                data: result.order,
                notificationsSent: result.notificationsSent,
                message: result.notificationsSent
                    ? 'Order completed and all notifications sent successfully'
                    : 'Order completed but some notifications may have failed'
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get(':id')
    async getOrder(@Param('id') id: string) {
        try {
            const order = await this.orderService.findById(id);
            if (!order) {
                throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: order
            };
        } catch (error) {
            throw new HttpException(
                { success: false, message: error.message },
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

// examples/basic-usage/src/controllers/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { EventEmitterService, QueueService } from '@afidos/nestjs-event-notifications';

@Controller('health')
export class HealthController {
    constructor(
        private readonly eventEmitter: EventEmitterService,
        private readonly queueService: QueueService
    ) {}

    @Get()
    async getHealth() {
        try {
            const eventHealth = await this.eventEmitter.healthCheck();
            const queueStats = await this.queueService.getQueueStats();

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    events: eventHealth,
                    queue: {
                        healthy: true,
                        stats: queueStats
                    }
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }
}

// examples/basic-usage/src/services/user.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { User } from '../entities/user.entity';
import { MyAppEvents } from '../types/events.types';

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
    ) {}

    async createUser(createUserDto: CreateUserDto): Promise<User> {
        try {
            // Vérifier si l'utilisateur existe déjà
            const existingUser = await this.userRepository.findOne({
                where: { email: createUserDto.email }
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

            // Émettre l'événement de bienvenue (async)
            await this.eventEmitter.emitAsync('user.welcome', {
                userId: savedUser.id,
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

    async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string }> {
        try {
            const user = await this.userRepository.findOne({ where: { email } });
            if (!user) {
                return { success: false };
            }

            // Générer un token de reset
            const resetToken = await this.generateResetToken();

            // Sauvegarder le token
            user.resetToken = resetToken;
            user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 heure
            await this.userRepository.save(user);

            // Émettre l'événement de reset (sync pour s'assurer que l'email est envoyé)
            const result = await this.eventEmitter.emitSync('user.password.reset', {
                userId: user.id,
                email: user.email,
                resetToken
            });

            // Vérifier que l'email a été envoyé avec succès
            const emailSent = result.results?.some(r =>
                r.channel === 'email' && r.status === 'sent'
            );

            if (!emailSent) {
                this.logger.error('Failed to send password reset email', {
                    userId: user.id,
                    email: user.email,
                    results: result.results
                });
                return { success: false };
            }

            this.logger.log(`Password reset email sent successfully`, {
                userId: user.id,
                email: user.email
            });

            return { success: true, token: resetToken };

        } catch (error) {
            this.logger.error('Failed to request password reset', {
                email,
                error: error.message
            });
            return { success: false };
        }
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    private async hashPassword(password: string): Promise<string> {
        // Implémentation simple pour l'exemple (utiliser bcrypt en production)
        return `hashed_${password}`;
    }

    private async generateResetToken(): Promise<string> {
        // Génération sécurisée du token
        return `reset_${Date.now()}_${Math.random().toString(36)}`;
    }
}

// examples/basic-usage/src/services/order.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { Order } from '../entities/order.entity';
import { MyAppEvents } from '../types/events.types';

interface CreateOrderDto {
    customerId: number;
    items: Array<{
        productId: string;
        quantity: number;
        price: number;
    }>;
}

interface CompleteOrderDto {
    orderId: string;
    paymentMethod: string;
}

@Injectable()
export class OrderService {
    private readonly logger = new Logger(OrderService.name);

    constructor(
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        private eventEmitter: EventEmitterService<MyAppEvents>
    ) {}

    async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
        try {
            const amount = createOrderDto.items.reduce(
                (total, item) => total + (item.price * item.quantity),
                0
            );

            const order = this.orderRepository.create({
                customerId: createOrderDto.customerId,
                amount,
                items: createOrderDto.items,
                status: 'pending'
            });

            const savedOrder = await this.orderRepository.save(order);

            // Émettre l'événement de création (async)
            await this.eventEmitter.emitAsync('order.created', {
                orderId: savedOrder.id,
                customerId: savedOrder.customerId,
                amount: savedOrder.amount,
                items: createOrderDto.items
            });

            this.logger.log(`Order created: ${savedOrder.id}`);
            return savedOrder;

        } catch (error) {
            this.logger.error('Failed to create order', {
                customerId: createOrderDto.customerId,
                error: error.message
            });
            throw error;
        }
    }

    async completeOrder(completeOrderDto: CompleteOrderDto): Promise<{
        order: Order;
        notificationsSent: boolean;
    }> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: completeOrderDto.orderId }
            });

            if (!order) {
                throw new Error(`Order not found: ${completeOrderDto.orderId}`);
            }

            // Mettre à jour le statut de la commande
            order.status = 'completed';
            order.paymentMethod = completeOrderDto.paymentMethod;
            order.completedAt = new Date();

            const savedOrder = await this.orderRepository.save(order);

            // Émettre l'événement de finalisation (sync avec attente)
            const result = await this.eventEmitter.emitAndWait(
                'order.completed',
                {
                    orderId: savedOrder.id,
                    customerId: savedOrder.customerId,
                    amount: savedOrder.amount,
                    paymentMethod: completeOrderDto.paymentMethod
                },
                15000 // timeout 15s
            );

            // Vérifier que toutes les notifications ont été envoyées
            const allNotificationsSent = result.results?.every(r => r.status === 'sent') || false;

            this.logger.log(`Order completed: ${savedOrder.id}`, {
                notificationsSent: allNotificationsSent,
                results: result.results
            });

            return {
                order: savedOrder,
                notificationsSent: allNotificationsSent
            };

        } catch (error) {
            this.logger.error('Failed to complete order', {
                orderId: completeOrderDto.orderId,
                error: error.message
            });
            throw error;
        }
    }

    async findById(id: string): Promise<Order | null> {
        return this.orderRepository.findOne({ where: { id } });
    }
}

// examples/basic-usage/src/types/events.types.ts
import { EventPayloads } from '@afidos/nestjs-event-notifications';

// Types d'événements de l'application d'exemple
export interface MyAppEvents extends EventPayloads {
    'user.welcome': {
        userId: number;
        email: string;
        firstName: string;
        lastName: string;
    };
    'user.password.reset': {
        userId: number;
        email: string;
        resetToken: string;
    };
    'order.created': {
        orderId: string;
        customerId: number;
        amount: number;
        items: Array<{ productId: string; quantity: number; price: number; }>;
    };
    'order.completed': {
        orderId: string;
        customerId: number;
        amount: number;
        paymentMethod: string;
    };
}

// examples/basic-usage/.env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=notifications_example

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com

# Webhook Configuration
WEBHOOK_URL=https://webhook.site/your-unique-id
WEBHOOK_TOKEN=example-token

# Application
PORT=3000
NODE_ENV=development

// examples/basic-usage/tsconfig.json
{
    "extends": "../../tsconfig.json",
    "compilerOptions": {
    "outDir": "./dist",
        "rootDir": "./src",
        "baseUrl": "./",
        "paths": {
        "@afidos/nestjs-event-notifications": ["../../src/index.ts"],
            "@afidos/nestjs-event-notifications/*": ["../../src/*"]
    }
},
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}

// examples/basic-usage/docker-compose.yml
version: '3.8'

services:
    postgres:
        image: postgres:15-alpine
environment:
    POSTGRES_DB: notifications_example
POSTGRES_USER: postgres
POSTGRES_PASSWORD: password
ports:
    - "5432:5432"
volumes:
    - postgres_data:/var/lib/postgresql/data

redis:
    image: redis:7-alpine
ports:
    - "6379:6379"
volumes:
    - redis_data:/data

volumes:
    postgres_data:
        redis_data:

// Makefile - Commandes pour lancer l'exemple localement
        .PHONY: setup install-example start-services start-example test-example clean

# Installation complète
setup: install-example start-services
@echo "✅ Example setup completed!"
@echo "🚀 Run 'make start-example' to start the application"

# Installer les dépendances de l'exemple
install-example:
@echo "📦 Installing example dependencies..."
cd examples/basic-usage && npm install

# Démarrer les services (PostgreSQL, Redis)
start-services:
@echo "🐳 Starting services..."
cd examples/basic-usage && docker-compose up -d
@echo "⏳ Waiting for services to be ready..."
sleep 10

# Démarrer l'application d'exemple
start-example:
@echo "🚀 Starting example application..."
cd examples/basic-usage && npm run start:dev

# Tester l'exemple
test-example:
@echo "🧪 Testing example endpoints..."
curl -X POST http://localhost:3000/users \
    -H "Content-Type: application/json" \
		-d '{"email":"test@example.com","firstName":"Test","lastName":"User","password":"password123"}'
@echo "\n"
curl -X GET http://localhost:3000/health

    # Nettoyer les services
clean:
@echo "🧹 Cleaning up..."
cd examples/basic-usage && docker-compose down -v
cd examples/basic-usage && rm -rf node_modules dist

# README.md pour l'exemple
# Basic Usage Example

Cet exemple montre comment utiliser `@afidos/nestjs-event-notifications` dans une application NestJS réelle.

## Installation et Lancement Rapide

### Option 1: Avec Make (Recommandé)
    ```bash
# Depuis la racine du projet
make setup          # Installe tout et démarre les services
make start-example   # Démarre l'application
make test-example    # Teste les endpoints
make clean          # Nettoie tout
```

### Option 2: Manuel

1. **Installer les dépendances de l'exemple**
    ```bash
cd examples/basic-usage
npm install
```

2. **Démarrer les services (PostgreSQL + Redis)**
```bash
docker-compose up -d
```

3. **Configurer les variables d'environnement**
    ```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Démarrer l'application**
    ```bash
npm run start:dev
```

## Test des Fonctionnalités

### Créer un utilisateur (déclenche email de bienvenue)
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "password123"
  }'
```

### Demander une réinitialisation de mot de passe (email synchrone)
```bash
curl -X POST http://localhost:3000/users/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Vérifier la santé du système
    ```bash
curl http://localhost:3000/health
```

## Architecture de l'Exemple

    ```
src/
├── main.ts                 # Point d'entrée
├── app.module.ts           # Configuration du package
├── controllers/            # API REST
├── services/              # Logique métier + événements
├── entities/              # Entités TypeORM
└── types/                 # Types d'événements
```

## Lien avec le Package Local

L'exemple utilise le package local via:
    ```json
{
  "dependencies": {
    "@afidos/nestjs-event-notifications": "file:../../"
  }
}
```

Le TypeScript est configuré pour résoudre les imports:
    ```json
{
  "paths": {
    "@afidos/nestjs-event-notifications": ["../../src/index.ts"]
  }
}
```
