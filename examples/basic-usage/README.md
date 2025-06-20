# Basic Usage - NestJS Event Notifications

Exemple complet d'utilisation de la librairie `@afidos/nestjs-event-notifications` avec la **nouvelle architecture v1.0.0**.

## 🚀 Architecture de l'Exemple (v1.0.0)

Cette application démontre les **nouvelles fonctionnalités** :

- **✨ Auto-découverte des providers** : Via décorateur `@InjectableNotifier`
- **⚡ Gestion intelligente des queues** : Mode `hybrid` avec Redis
- **🔒 Type safety automatique** : Drivers avec augmentation de module
- **📦 Configuration simplifiée** : Plus besoin de config manuelle des providers
- **🎯 Orchestration centralisée** : `QueueManagerService` + `NotificationOrchestratorService`
- **🚀 Worker en processus séparé** : Mode `worker` avec scaling horizontal
- **🐳 Déploiement Docker** : API + Worker + Redis avec docker-compose
- **Extensions d'interface TypeScript** : Type safety avec propriétés dynamiques
- **RecipientLoader statique** : Résolution des destinataires par type d'événement

## 📂 Structure

```
src/
├── config.ts                    # Types d'événements et configuration
├── main.ts                      # Point d'entrée API (mode: api/hybrid)
├── worker.ts                    # Point d'entrée Worker (mode: worker)
├── app.module.ts                 # Configuration NestJS API
├── worker.module.ts             # Configuration NestJS Worker
├── providers/
│   ├── email.provider.ts         # Provider email (SmtpDriver)
│   ├── telegram.provider.ts      # Provider Telegram (HttpDriver)
│   └── webhook.provider.ts       # Provider webhook (HttpDriver)
├── loaders/
│   └── static-recipient.loader.ts # Loader statique des destinataires
├── user/
│   ├── user.entity.ts            # Entité utilisateur
│   ├── user.service.ts           # Service avec émission d'événements
│   └── user.controller.ts        # API REST
├── order/
│   ├── order.entity.ts           # Entité commande
│   ├── order.service.ts          # Service avec émission d'événements
│   └── order.controller.ts       # API REST
└── health/
    └── health.controller.ts      # Health checks

# Déploiement
├── Dockerfile                   # Image API
├── Dockerfile.worker            # Image Worker
├── docker-compose.yml           # API + Worker + Redis
└── .env.example                 # Variables d'environnement
```

## 🎯 Types d'Événements Supportés

### Événements Utilisateur
- `user.created` - Nouvel utilisateur créé (email, telegramId, webhookUrl)
- `user.updated` - Utilisateur mis à jour (email)

### Événements Commande  
- `order.created` - Nouvelle commande (email, telegramId, webhookUrl)
- `order.shipped` - Commande expédiée (email, telegramId)
- `order.delivered` - Commande livrée (email)

### Événements Système
- `system.error` - Erreur critique (email, telegramId, webhookUrl)
- `system.maintenance` - Maintenance programmée (email, telegramId)

## 🚀 Démarrage

### 1. Installation

```bash
npm install
```

### 2. Configuration Manuelle

Cette application utilise une **configuration manuelle complète** des providers :

#### 📋 Dans `config.ts` - Configuration des Providers

```typescript
providers: {
    email: {
        driver: 'smtp',
        config: {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER || 'your-email@gmail.com',
                pass: process.env.SMTP_PASS || 'your-password'
            },
            from: process.env.SMTP_FROM || 'noreply@example.com'
        }
    },
    telegram: {
        driver: 'http',
        config: {
            botToken: process.env.TELEGRAM_BOT_TOKEN || '123456:ABC-DEF',
            parseMode: 'HTML'
        }
    },
    webhook: {
        driver: 'http',
        config: {
            endpoint: process.env.WEBHOOK_URL || 'https://webhook.site/test',
            method: 'POST'
        }
    }
}
```

#### 🏗️ Dans `app.module.ts` - Implémentation des Providers

```typescript
providers: [
    // Drivers
    HttpDriver,
    {
        provide: SmtpDriver,
        useFactory: () => new SmtpDriver({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            // ... configuration SMTP
        })
    },
    
    // Providers avec injection de dépendances
    {
        provide: EmailProvider,
        useFactory: (loader: StaticRecipientLoader, smtp: SmtpDriver) =>
            new EmailProvider(loader, smtp, process.env.SMTP_FROM),
        inject: [StaticRecipientLoader, SmtpDriver]
    }
    // ... autres providers
]
```

#### 📝 Variables d'Environnement

Créer un fichier `.env` :

```bash
# Base de données
NODE_ENV=development

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# Telegram (optionnel)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Webhooks (optionnel)
WEBHOOK_URL=https://your-webhook-url.com/notifications

# Redis (optionnel)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### ✅ Avantages de la Configuration Manuelle

- **🔧 Contrôle total** : Vous définissez exactement comment chaque provider est configuré
- **🎯 Transparence** : Aucune "magie" cachée, tout est explicite dans le code
- **🔒 Sécurité** : Pas de configuration automatique non désirée
- **⚡ Performance** : Pas de détection runtime, configuration au démarrage
- **🛠️ Flexibilité** : Configuration sur mesure pour chaque provider
- **📋 Maintenabilité** : Configuration centralisée et documentée

### 3. Lancement

#### 🚀 Mode Développement Simple

```bash
# API seulement (mode hybrid)
npm run start:dev

# Worker seulement
npm run start:worker:dev

# API + Worker en parallèle
npm run start:both
```

#### 🏭 Mode Production

```bash
# Build
npm run build

# Lancer API (mode api - queue vers Redis)
npm run start:prod

# Lancer Worker (mode worker - traite la queue)
npm run start:worker
```

#### 🐳 Mode Docker

```bash
# Lancer API + Worker + Redis
docker-compose up

# Avec scaling (2 workers)
docker-compose --profile scaling up

# Avec monitoring Redis
docker-compose --profile monitoring up
```

L'application sera disponible sur http://localhost:3000

## 🧪 Test des Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

### Créer un Utilisateur

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "firstName": "John", 
    "lastName": "Doe",
    "password": "securePassword123"
  }'
```

**Événement déclenché** : `user.created`
**Notifications envoyées** : Email de bienvenue + Telegram + Webhook

### Mettre à Jour un Utilisateur

```bash
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

**Événement déclenché** : `user.updated`
**Notifications envoyées** : Email de confirmation

### Créer une Commande

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "items": [
      {
        "productId": "prod-001",
        "quantity": 2,
        "price": 29.99
      }
    ]
  }'
```

**Événement déclenché** : `order.created`
**Notifications envoyées** : Email + Telegram + Webhook

### Finaliser une Commande

```bash
curl -X POST http://localhost:3000/orders/1/complete \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "credit_card"
  }'
```

**Événement déclenché** : `order.shipped`
**Notifications envoyées** : Email + Telegram avec numéro de suivi

## 🔧 Configuration des Providers

### EmailProvider
- **Driver** : SmtpDriver
- **Extension d'interface** : `{ email?, firstName?, lastName? }`
- **Templates** : HTML et texte pour chaque type d'événement

### TelegramProvider  
- **Driver** : HttpDriver
- **Extension d'interface** : `{ telegramId?, telegramUsername? }`
- **Messages** : Formatage HTML avec émojis

### WebhookProvider
- **Driver** : HttpDriver
- **Extension d'interface** : `{ webhookUrl?, webhookHeaders? }`
- **Payload** : JSON structuré avec métadonnées

## 📊 Résolution des Destinataires

Le `StaticRecipientLoader` gère la résolution des destinataires :

```typescript
// Exemple pour user.created
{
  id: payload.id?.toString(),
  email: payload.email,
  firstName: payload.firstName,
  lastName: payload.lastName,
  telegramId: process.env.USER_TELEGRAM_ID, // Mock
  webhookUrl: process.env.WEBHOOK_URL,
  preferences: { enabled: true }
}
```

En production, remplacez par un loader qui interroge votre base de données.

## 📋 Logs et Debugging

### API Mode (Immediate Processing)
```bash
[EventEmitter] Emitting event: user.created
[EmailProvider] Email sent successfully to john.doe@example.com
[TelegramProvider] Telegram message sent to chat 123456789
[WebhookProvider] Webhook sent to https://your-webhook.com
```

### Worker Mode (Queue Processing)
```bash
[Worker] 🚀 Starting worker process...
[Worker] ✅ Worker started and listening for events...
[QueueManager] 📥 Processing job: user.created (attempt 1/3)
[EmailProvider] Email sent successfully to john.doe@example.com
[QueueManager] ✅ Job completed: user.created
[Worker] 💓 Worker heartbeat - Ready for jobs
```

### Hybrid Mode (Intelligent)
```bash
[QueueManager] 📡 Redis available - using queue for async processing
[EventEmitter] Emitting event: user.created
[QueueManager] 📤 Event queued: user.created
# Worker logs...
```

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## 📝 Personnalisation

### Ajouter un Nouveau Provider

1. Créer le provider dans `src/providers/`
2. Étendre l'interface `Recipient` avec vos propriétés
3. L'ajouter dans `app.module.ts` ET `worker.module.ts`
4. Mettre à jour la configuration des événements

### Ajouter un Nouveau Type d'Événement

1. Ajouter le type dans `MyAppEvents` (config.ts)
2. Configurer les canaux dans `eventTypesConfig`
3. Mettre à jour le `RecipientLoader`
4. Ajouter la logique métier dans vos services

### Configurer le Worker en Production

1. **Scaling Horizontal** : Lancer plusieurs instances worker
   ```bash
   # Terminal 1
   npm run start:worker
   
   # Terminal 2 
   npm run start:worker
   ```

2. **Docker Scaling** : Utiliser docker-compose scale
   ```bash
   docker-compose up --scale worker=3
   ```

3. **Mode Worker-Only** : Configuration pour worker dédié
   ```typescript
   // worker.module.ts
   EventNotificationsModule.forRoot<MyAppEvents>({
     mode: 'worker',  // ← Worker uniquement
     queue: { redis: {...} }
   })
   ```

## 🔍 Monitoring

### Health Checks Disponibles

- `GET /health` - Santé générale de l'application API
- **Worker monitoring** : Logs avec heartbeat et métriques
- **Redis monitoring** : Redis Commander sur `:8081` (optionnel)
- **Queue monitoring** : Logs détaillés des jobs
- Gestion des erreurs et retry automatique

### Métriques Worker

```bash
# Logs worker avec métriques
[Worker] 💓 Worker heartbeat - Ready for jobs
[QueueManager] 📊 Queue stats: 5 waiting, 2 active, 10 completed
[QueueManager] ⚡ Job processed in 1.2s
```

## 📚 En Savoir Plus

- [Documentation de la librairie](../../README.md)
- [Architecture des drivers](../../src/drivers/)
- [Types et interfaces](../../src/types/)

## 🏷️ Technologies

- **NestJS** - Framework Node.js
- **TypeScript** - Langage typé
- **TypeORM** - ORM avec SQLite
- **nodemailer** - Envoi d'emails
- **Redis** - Queue des tâches et scaling worker
- **Docker** - Containerisation API + Worker
- **Bull** - Gestion des queues Redis
- **Concurrently** - Développement API + Worker parallèle