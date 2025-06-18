# NestJS Event Notifications

Une librairie moderne et extensible pour gérer les notifications d'événements dans les applications NestJS.

## 🚀 Caractéristiques

- **🏗️ Architecture basée sur des drivers** - Drivers HTTP et SMTP pré-configurés
- **🔒 Extensions d'interface TypeScript** - Type safety garantie avec support des propriétés dynamiques
- **📧 Providers extensibles** - Email, Telegram, Webhook pré-conçus + créez les vôtres
- **🎯 RecipientLoader** - Résolution dynamique des destinataires
- **🔍 Auto-découverte** - Décorateur `@InjectableNotifier` pour découverte automatique des providers
- **⚡ Gestion intelligente des queues** - Modes `api`, `worker`, `hybrid` avec Redis
- **⚙️ Configuration simplifiée** - Plus besoin de configuration manuelle des providers

## 📦 Installation

```bash
npm install @afidos/nestjs-event-notifications
```

## 🏗️ Architecture

La librairie suit une architecture simple et extensible :

### Drivers (Transport)
- **HttpDriver** - Pour toutes les communications HTTP (APIs, webhooks, Telegram, etc.)
- **SmtpDriver** - Pour l'envoi d'emails avec nodemailer

### Providers (Business Logic)
Les providers s'auto-enregistrent avec `@InjectableNotifier` et étendent l'interface `Recipient` :
- **EmailProvider** - Utilise SmtpDriver + `{ email?, firstName?, lastName? }`
- **TelegramProvider** - Utilise HttpDriver + `{ telegramId?, telegramUsername? }`
- **WebhookProvider** - Utilise HttpDriver + `{ webhookUrl?, webhookHeaders? }`

### Auto-découverte
Le système `NotifierRegistry` découvre automatiquement les providers via le décorateur `@InjectableNotifier`.

### Gestion des Queues
- **Mode `api`** : Traitement immédiat uniquement
- **Mode `worker`** : Queue Redis obligatoire, traitement différé
- **Mode `hybrid`** : Queue si disponible, sinon traitement immédiat

### RecipientLoader
Interface pour résoudre dynamiquement les destinataires selon le type d'événement.

## 🚀 Démarrage Rapide

### 1. Configuration des Types d'Événements

```typescript
// config.ts
import { EventPayloads, createEventTypeConfig } from '@afidos/nestjs-event-notifications';

export interface MyAppEvents extends EventPayloads {
    'user.created': {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
    };
    'order.shipped': {
        id: string;
        userId: number;
        customerEmail: string;
        customerName: string;
        trackingNumber?: string;
    };
}

export const eventTypesConfig = createEventTypeConfig<MyAppEvents>({
    'user.created': {
        description: 'Nouvel utilisateur créé',
        channels: ['email', 'telegram'],  // ← Identifiants des providers
        defaultProcessing: 'async',
        retryAttempts: 3
    },
    'order.shipped': {
        description: 'Commande expédiée',
        channels: ['email', 'telegram'],
        defaultProcessing: 'async',
        retryAttempts: 2
    }
});

// Configuration du package (simplifiée)
export const packageConfig = createPackageConfig<MyAppEvents>({
    eventTypes: eventTypesConfig,
    
    // Plus besoin de configuration providers !
    // L'auto-découverte via @InjectableNotifier s'en charge
    
    queue: {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379')
        }
    },
    
    mode: 'hybrid',  // ou 'api', 'worker'
    
    global: {
        defaultTimeout: 30000,
        enableDetailedLogs: true
    }
});
```

### 2. Configuration du Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import {
    EventNotificationsModule,
    HttpDriver,
    SmtpDriver
} from '@afidos/nestjs-event-notifications';
import { EmailProvider } from './providers/email.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { StaticRecipientLoader } from './loaders/static-recipient.loader';
import { eventTypesConfig } from './config';

@Module({
    imports: [
        EventNotificationsModule.forRoot(packageConfig)  // ← Configuration simplifiée
    ],
    providers: [
        // Drivers
        HttpDriver,
        {
            provide: SmtpDriver,
            useFactory: () => new SmtpDriver({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            })
        },
        
        // Recipient loader
        StaticRecipientLoader,
        
        // Providers avec auto-découverte
        EmailProvider,     // ← Plus besoin de factory!
        TelegramProvider,  // ← Auto-découverte via @InjectableNotifier
        WebhookProvider    // ← Configuration dans le décorateur
    ]
})
export class AppModule {}
```

### 3. Variables d'Environnement

```bash
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com  
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Redis (optionnel)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Créer un Provider (Optionnel)

```typescript
// providers/email.provider.ts
import { Logger } from '@nestjs/common';
import {
    NotificationProviderBase,
    SmtpDriver,
    RecipientLoader,
    Recipient,
    NotificationResult,
    NotificationContext,
    EmailMessage,
    InjectableNotifier  // ← Nouveau décorateur
} from '@afidos/nestjs-event-notifications';

// Extension de l'interface Recipient
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        email?: string;
        firstName?: string;
        lastName?: string;
    }
}

@InjectableNotifier({
    channel: 'email',        // ← Identifiant pour discovery
    driver: 'smtp',          // ← Driver utilisé
    description: 'Provider pour notifications email via SMTP'
})
export class EmailProvider extends NotificationProviderBase<'email'> {
    protected readonly property = 'email';  // ← Propriété Recipient (optionnel)

    constructor(
        recipientLoader: RecipientLoader,
        private readonly smtpDriver: SmtpDriver,
        private readonly fromEmail: string = 'noreply@example.com'
    ) {
        super(recipientLoader);
    }

    protected async sendToAddress(
        address: string,
        eventType: string,
        payload: any,
        recipient: Recipient,
        context: NotificationContext
    ): Promise<NotificationResult> {
        const message: EmailMessage = {
            to: address,
            from: this.fromEmail,
            subject: this.buildSubject(eventType, payload),
            html: this.buildHtmlBody(eventType, payload, recipient),
            text: this.buildTextBody(eventType, payload, recipient)
        };

        const result = await this.smtpDriver.send(message);

        return {
            channel: this.getChannelName(),  // ← Récupère depuis le décorateur
            provider: this.getProviderName(),
            status: 'sent',
            sentAt: new Date(),
            attempts: context.attempt,
            metadata: {
                messageId: result.messageId,
                recipientId: recipient.id
            }
        };
    }

    private buildSubject(eventType: string, payload: any): string {
        switch (eventType) {
            case 'user.created': return '🎉 Bienvenue !';
            case 'order.shipped': return '🚚 Commande expédiée';
            default: return `Notification: ${eventType}`;
        }
    }

    // ... autres méthodes
}
```

### 4. Créer un RecipientLoader

```typescript
// loaders/static-recipient.loader.ts
import { Injectable } from '@nestjs/common';
import { RecipientLoader, Recipient } from '@afidos/nestjs-event-notifications';

@Injectable()
export class StaticRecipientLoader implements RecipientLoader {
    async load(eventType: string, payload: any): Promise<Recipient[]> {
        switch (eventType) {
            case 'user.created':
                return [{
                    id: payload.id?.toString(),
                    email: payload.email,
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    preferences: { enabled: true }
                }];
                
            case 'order.shipped':
                return [{
                    id: payload.userId?.toString(),
                    email: payload.customerEmail,
                    firstName: payload.customerName?.split(' ')[0],
                    preferences: { enabled: true }
                }];
                
            default:
                return [];
        }
    }
}
```

### 5. Émettre des Événements

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { MyAppEvents } from './config';

@Injectable()
export class UserService {
    constructor(
        private readonly eventEmitter: EventEmitterService<MyAppEvents>
    ) {}

    async createUser(userData: any) {
        const user = await this.userRepository.save(userData);

        // Émettre l'événement (async avec auto-découverte)
        const result = await this.eventEmitter.emitAsync('user.created', {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        });
        
        // Le système découvre automatiquement EmailProvider et TelegramProvider
        // via @InjectableNotifier et envoie les notifications

        return user;
    }
}
```

## 🔧 Configuration

### Variables d'Environnement

```bash
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@yourapp.com

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Redis (pour les queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Webhooks
WEBHOOK_URL=https://your-webhook-url.com
```

## 🆕 Nouveautés v1.0.0

### Auto-découverte avec `@InjectableNotifier`
```typescript
@InjectableNotifier({
    channel: 'telegram',
    driver: 'http',
    description: 'Provider Telegram'
})
export class TelegramProvider extends NotificationProviderBase<'telegramId'> {
    protected readonly property = 'telegramId';  // Optionnel
    
    // Le provider s'enregistre automatiquement !
    // Plus besoin de configuration manuelle
}
```

### Gestion Intelligente des Queues
```typescript
export const packageConfig = createPackageConfig({
    mode: 'hybrid',  // 'api', 'worker', ou 'hybrid'
    
    queue: {
        redis: { host: 'localhost', port: 6379 }
    },
    
    // Le système décide automatiquement :
    // - Mode 'api' : traitement immédiat
    // - Mode 'worker' : queue obligatoire  
    // - Mode 'hybrid' : queue si disponible, sinon immédiat
});
```

### Type Safety pour les Drivers
```typescript
// Augmentation de module automatique
import '@afidos/nestjs-event-notifications/drivers/smtp.driver';
import '@afidos/nestjs-event-notifications/drivers/http.driver';

// TypeScript valide automatiquement driver ↔ config
const provider: NotificationProviderConfig<'smtp'> = {
    driver: 'smtp',  // ✅ 
    config: {        // ✅ Type SmtpDriverConfig automatique
        host: 'smtp.gmail.com',
        port: 587
    }
};
```

## 📚 Exemple Complet

Consultez le dossier `examples/basic-usage` pour un exemple complet avec :
- **Auto-découverte des providers** via `@InjectableNotifier`
- Configuration TypeScript type-safe
- Gestion intelligente des queues (`hybrid` mode)
- Providers Email, Telegram et Webhook
- RecipientLoader statique
- Contrôleurs REST pour déclencher des événements
- Tests unitaires

## 🏃‍♂️ Lancer l'Exemple

```bash
cd examples/basic-usage
npm install
npm run build
npm run start:dev
```

Puis testez les endpoints :
```bash
# Créer un utilisateur (déclenche user.created)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"John","lastName":"Doe","password":"test123"}'

# Créer une commande (déclenche order.created)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":1,"items":[{"productId":"prod1","quantity":2,"price":10.50}]}'
```

## 🔄 Migration depuis v0.x

Si vous migrez depuis une version antérieure :

### 1. Remplacement de `@Injectable()` par `@InjectableNotifier()`
```typescript
// Avant
@Injectable()
export class EmailProvider extends NotificationProviderBase<'email'> {
    readonly channel = 'email';
}

// Maintenant
@InjectableNotifier({
    channel: 'email',
    driver: 'smtp',
    description: 'Provider email'
})
export class EmailProvider extends NotificationProviderBase<'email'> {
    protected readonly property = 'email';  // Optionnel
}
```

### 2. Simplification de la configuration
```typescript
// Avant - Configuration manuelle complexe
providers: {
    email: {
        driver: 'smtp',
        config: { host: 'smtp.gmail.com', port: 587, auth: {} }
    }
}

// Maintenant - Auto-découverte
// Plus besoin ! Les providers s'enregistrent automatiquement
```

### 3. Utilisation de `getChannelName()` au lieu de `this.channel`
```typescript
// Avant
return {
    channel: this.channel,  // ❌ 
    provider: this.getProviderName()
};

// Maintenant  
return {
    channel: this.getChannelName(),  // ✅ Récupère depuis @InjectableNotifier
    provider: this.getProviderName()
};
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changes (`git commit -m 'Add amazing feature'`)
4. Push sur la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

[MIT](LICENSE)

## 🏷️ Version

**1.0.0** - Architecture modernisée avec :
- ✨ Auto-découverte des providers via `@InjectableNotifier`
- ⚡ Gestion intelligente des queues (modes `api`/`worker`/`hybrid`)
- 🔒 Type safety automatique pour les drivers (augmentation de module)
- 📦 Configuration simplifiée (plus besoin de config manuelle des providers)
- 🚀 Système d'orchestration centralisé avec `QueueManagerService`