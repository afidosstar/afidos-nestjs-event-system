# Architecture @afidos/nestjs-event-notifications

## Vue d'ensemble

La librairie `@afidos/nestjs-event-notifications` suit une architecture modulaire basée sur les patterns **Event-Driven Architecture**, **Publisher-Subscriber** et **Handler Pattern**. Elle supporte deux approches complémentaires :

1. **Notification System** - Pour les notifications externes (emails, webhooks, etc.)
2. **Event Handler System** - Pour le traitement métier des événements

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐│
│  │   Controllers   │    │    Services     │    │   Components    ││
│  └─────────────────┘    └─────────────────┘    └─────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT EMITTER SERVICE                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              EventEmitterService<T>                         ││
│  │  • emitAsync() / emitSync()                                 ││
│  │  • Type-safe event payloads                                ││
│  │  • Correlation tracking                                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESSING LAYER                             │
│                                                                 │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │   NOTIFICATION SYSTEM   │    │    EVENT HANDLER SYSTEM     │  │
│  │                         │    │                             │  │
│  │  ┌─────────────────────┐│    │  ┌─────────────────────────┐│  │
│  │  │ NotificationOrchest │││    │  │ EventHandlerManager     ││  │
│  │  │ ratorService        │││    │  │ Service                 ││  │
│  │  └─────────────────────┘││    │  └─────────────────────────┘│  │
│  │           │             ││    │           │                 │  │
│  │           ▼             ││    │           ▼                 │  │
│  │  ┌─────────────────────┐││    │  ┌─────────────────────────┐│  │
│  │  │ Notification        │││    │  │ Event Handlers          ││  │
│  │  │ Providers           │││    │  │ (@InjectableHandler)    ││  │
│  │  │ (@InjectableNotifier│││    │  │                         ││  │
│  │  │                     │││    │  │ • execute()             ││  │
│  │  │ • EmailProvider     │││    │  │ • beforeQueue()         ││  │
│  │  │ • TelegramProvider  │││    │  │ • afterExecute()        ││  │
│  │  │ • WebhookProvider   │││    │  │ • onError()             ││  │
│  │  │ • Custom Providers  │││    │  │ • Priority support      ││  │
│  │  └─────────────────────┘││    │  │ • Wildcard support      ││  │
│  │                         ││    │  └─────────────────────────┘│  │
│  └─────────────────────────┘│    └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QUEUE MANAGEMENT                             │
│                                                                 │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │   QueueManagerService   │    │ HandlerQueueManagerService  │  │
│  │                         │    │                             │  │
│  │  • Notification Queues  │    │  • Handler-specific Queues │  │
│  │  • Retry Logic          │    │  • Priority Queues          │  │
│  │  • Health Monitoring    │    │  • Retry Policies           │  │
│  │  • Mode: api/worker/    │    │  • Concurrency Control     │  │
│  │    hybrid               │    │  • Timeout Management      │  │
│  └─────────────────────────┘    └─────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      REDIS QUEUES                           ││
│  │  ┌─────────────┐ ┌───────────────┐ ┌─────────────────────┐  ││
│  │  │ Notification│ │   Handler     │ │    Custom Queue     │  ││
│  │  │   Queue     │ │   Queues      │ │    Configurations   │  ││
│  │  └─────────────┘ └───────────────┘ └─────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSPORT LAYER                              │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │      HTTP Driver        │    │       SMTP Driver           │  │
│  │                         │    │                             │  │
│  │  • REST APIs            │    │  • SMTP Transport           │  │
│  │  • Webhooks             │    │  • Email Templates          │  │
│  │  • Telegram Bot API     │    │  • Attachment Support       │  │
│  │  • Custom HTTP Services│    │  • TLS/SSL Support          │  │
│  └─────────────────────────┘    └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Détaillée

### 1. Event Emitter Service

**Responsabilité** : Point d'entrée unique pour l'émission d'événements

```typescript
class EventEmitterService<T extends EventPayloads> {
  // Émission synchrone avec attente des résultats
  async emitSync(eventType: K, payload: T[K]): Promise<EventEmissionResult>
  
  // Émission asynchrone via queues
  async emitAsync(eventType: K, payload: T[K]): Promise<EventEmissionResult>
}
```

**Caractéristiques** :
- Type-safe avec les interfaces `EventPayloads`
- Génération automatique d'ID de corrélation
- Support des métadonnées contextuelles
- Gestion des options d'émission (retry, delay, etc.)

### 2. Système de Notifications

**Objectif** : Envoyer des notifications vers des canaux externes

#### Architecture des Providers

```typescript
@InjectableNotifier({
  channel: 'email',
  driver: 'smtp',
  description: 'Email notifications'
})
class EmailProvider extends NotificationProviderBase<'email'> {
  protected async sendToAddress(
    address: string,
    eventType: string,
    payload: any
  ): Promise<NotificationResult>
}
```

**Composants clés** :
- **NotificationOrchestratorService** : Coordination des notifications
- **NotificationProviderBase** : Classe de base pour les providers
- **RecipientLoader** : Résolution des destinataires
- **Driver Pattern** : Abstraction des transports (SMTP, HTTP)

### 3. Système d'Event Handlers

**Objectif** : Traitement métier des événements (analytics, audit, workflows)

#### Architecture des Handlers

```typescript
@InjectableHandler({
  name: 'UserAnalyticsHandler',
  eventTypes: ['user.created', 'user.updated'],
  priority: 100,
  queue: {
    processing: 'async',
    priority: 8,
    retry: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
  }
})
class UserAnalyticsHandler implements EventHandler {
  async execute(eventType: string, payload: any, context: EventHandlerContext): Promise<any>
  async beforeQueue?(): Promise<void>
  async afterExecute?(): Promise<void>
  async onError?(): Promise<void>
}
```

**Composants clés** :
- **EventHandlerManagerService** : Découverte et orchestration des handlers
- **HandlerQueueManagerService** : Gestion des queues spécifiques aux handlers
- **Auto-discovery** : Enregistrement automatique via `@InjectableHandler`
- **Priority System** : Exécution ordonnée des handlers
- **Lifecycle Callbacks** : Hooks avant/après exécution

### 4. Gestion des Queues

**Architecture multi-mode** :

#### Mode API (Immédiat)
```
Event → EventEmitter → Handlers/Providers → Résultat
```

#### Mode Worker (Queue obligatoire)
```
Event → EventEmitter → Queue → Worker → Handlers/Providers → Résultat
```

#### Mode Hybrid (Adaptatif)
```
Event → EventEmitter → Décision → Queue ou Direct → Handlers/Providers → Résultat
```

**Fonctionnalités des queues** :
- **Retry Logic** : Tentatives avec backoff exponentiel/fixe
- **Priority Queues** : Traitement prioritaire des événements
- **Concurrency Control** : Limitation du nombre de workers
- **Health Monitoring** : Surveillance de l'état des queues
- **Timeout Management** : Gestion des timeouts d'exécution

### 5. Configuration et Types

#### Configuration Globale
```typescript
interface PackageConfig<T extends EventPayloads> {
  eventTypes: EventTypeConfig<T>
  mode: 'api' | 'worker' | 'hybrid'
  queue?: QueueConfig
  global?: GlobalConfig
}
```

#### Configuration des Événements
```typescript
interface EventTypeConfig<T extends EventPayloads> {
  [K in keyof T]: {
    description: string
    channels: string[]
    defaultProcessing: 'sync' | 'async'
    retryAttempts?: number
    delay?: number
    priority?: 'low' | 'normal' | 'high' | 'critical'
  }
}
```

## Patterns Utilisés

### 1. Publisher-Subscriber Pattern
- **Publisher** : EventEmitterService
- **Subscribers** : NotificationProviders + EventHandlers
- **Event Bus** : Coordination centralisée

### 2. Handler Pattern
- Interface `EventHandler` avec méthode `execute()`
- Support des lifecycle callbacks
- Auto-discovery avec decorators

### 3. Provider Pattern
- Interface `NotificationProvider` avec méthode `send()`
- Abstraction des canaux de notification
- Configuration par decorators

### 4. Strategy Pattern
- Drivers interchangeables (SMTP, HTTP)
- Modes de queue configurables
- Policies de retry personnalisables

### 5. Factory Pattern
- QueueManagerService pour la création des queues
- Configuration dynamique des providers
- Instanciation automatique des handlers

## Avantages de l'Architecture

### 1. Séparation des Responsabilités
- **Notifications** : Communication externe
- **Handlers** : Logique métier
- **Queues** : Gestion de la charge
- **Transport** : Abstraction des protocols

### 2. Extensibilité
- Nouveaux providers via `@InjectableNotifier`
- Nouveaux handlers via `@InjectableHandler`
- Drivers personnalisés
- Modes de queue additionnels

### 3. Type Safety
- Payloads typés avec `EventPayloads`
- Configuration type-safe
- Auto-complétion IDE

### 4. Scalabilité
- Queues Redis pour la distribution
- Workers dédiés
- Retry automatique
- Monitoring intégré

### 5. Testabilité
- Services injectables
- Mocking des drivers
- Isolation des composants
- Logging détaillé

## Flux d'Exécution

### Émission d'un Événement

```
1. Controller/Service → EventEmitterService.emitAsync()
2. EventEmitterService → Génération context + correlation ID
3. EventEmitterService → QueueManagerService.processEvent()
4. QueueManagerService → Détermine mode (sync/async)
5. Si async → Queue Redis
6. Worker → Traite les jobs
7. NotificationOrchestratorService → Traite notifications
8. EventHandlerManagerService → Traite handlers
9. Résultats → Logs + Monitoring
```

### Traitement Parallel

```
┌─────────────────────┐
│   EventEmitter      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  QueueManager       │
└─────────┬───────────┘
          │
          ├─────────────────────┬─────────────────────
          ▼                     ▼
┌─────────────────────┐ ┌─────────────────────┐
│ NotificationOrchest │ │ HandlerManager      │
│ ratorService        │ │ Service             │
└─────────┬───────────┘ └─────────┬───────────┘
          │                       │
          ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐
│ Notification        │ │ Event Handlers      │
│ Providers           │ │                     │
│ (Email, Telegram,   │ │ (Analytics, Audit,  │
│  Webhook, etc.)     │ │  Workflows, etc.)   │
└─────────────────────┘ └─────────────────────┘
```

Cette architecture permet une séparation claire entre les préoccupations, une extensibilité maximale et une performance optimale grâce à la gestion intelligente des queues et au traitement parallèle des notifications et handlers.