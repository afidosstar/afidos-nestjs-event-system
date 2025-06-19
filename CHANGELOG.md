# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-01-19

### 🎯 Nouvelle Fonctionnalité Majeure : Event Handler System

#### Introduction du Pattern Event Handler
- **Nouveau décorateur `@InjectableHandler`** pour l'auto-découverte des handlers
- **Interface `EventHandler`** avec méthodes `execute()`, `beforeQueue()`, `afterExecute()`, `onError()`
- **Séparation claire** entre Notifications (externes) et Handlers (logique métier)
- **Support des wildcards** avec `eventTypes: ['*']` pour traiter tous les événements

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
export class UserAnalyticsHandler implements EventHandler {
  async execute(eventType: string, payload: any, context: EventHandlerContext): Promise<any> {
    // Logique métier (analytics, audit, workflows, etc.)
  }
}
```

#### Services de Gestion des Handlers
- **`EventHandlerManagerService`** - Découverte, enregistrement et orchestration des handlers
- **`HandlerQueueManagerService`** - Gestion des queues spécifiques aux handlers
- **Auto-discovery et priorités** - Enregistrement automatique avec tri par priorité
- **Gestion des erreurs avancée** - Callbacks `onError()` avec logging détaillé

#### Configuration des Queues pour Handlers
- **Configuration individuelle** par handler avec `HandlerQueueConfig`
- **Modes de traitement** : `sync`, `async`, `delayed`
- **Stratégies de retry** : Fixed, Exponential backoff
- **Priorités et concurrence** : 1-10 avec contrôle de concurrence
- **Timeout et TTL** : Gestion des timeouts et expiration des jobs

```typescript
interface HandlerQueueConfig {
  processing: 'sync' | 'async' | 'delayed'
  delay?: { ms: number; strategy?: 'fixed' | 'exponential' }
  retry?: { attempts: number; backoff?: { type: 'fixed' | 'exponential'; delay: number } }
  priority?: number // 1-10, 10 = plus haute priorité
  timeout?: number
  concurrency?: number
}
```

#### Lifecycle Callbacks et Context Enrichi
- **`beforeQueue()`** - Exécuté avant mise en queue
- **`afterExecute()`** - Exécuté après succès
- **`onError()`** - Gestion personnalisée des erreurs
- **`EventHandlerContext`** enrichi avec informations de queue et métadonnées

### 🏗️ Architecture Renforcée

#### Résolution des Dépendances Circulaires
- **Utilisation de `forwardRef()`** selon documentation NestJS
- **Injection des tokens de configuration** avec forwardRef
- **Architecture événementielle** réduisant les couplages directs
- **Services découplés** via le pattern Publisher-Subscriber

#### Traitement Parallèle Dual
```
EventEmitterService
        │
        ├─── NotificationOrchestratorService (Notifications externes)
        └─── EventHandlerManagerService (Logique métier)
```

### 📊 Monitoring et Observabilité

#### Statistiques Complètes
- **Health checks** pour handlers et queues
- **Métriques par handler** : succès, échecs, durée d'exécution
- **État des queues** : nombre de jobs en attente, actifs, complétés
- **Monitoring des priorités** et performances

#### Logging Structuré
- **Logs détaillés** par handler avec contexte
- **Traces de corrélation** inter-services
- **Métriques de performance** par handler et par queue
- **Monitoring des retry** et backoff strategies

### 🧪 Exemples et Documentation

#### Exemples Complets
- **`UserAnalyticsHandler`** - Handler async avec queue et retry
- **`AuditLogHandler`** - Handler sync pour tous les événements (wildcard)
- **Configuration avancée** avec priorités et stratégies de retry
- **Tests unitaires** pour les nouveaux composants

### ⚡ Performance et Scalabilité

#### Optimisations
- **Queues dédiées** par handler évitant les conflits
- **Priorités granulaires** pour l'ordonnancement optimal
- **Concurrence configurable** par handler
- **Retry intelligent** avec backoff exponentiel

#### Modes de Fonctionnement
- **Mode API** : Handlers sync uniquement
- **Mode Worker** : Toutes queues via Redis
- **Mode Hybrid** : Mix sync/async selon configuration

### 🔄 Compatibilité

#### Rétrocompatibilité
- **NotificationProviderBase conservé** - toujours nécessaire pour les providers
- **API EventEmitterService inchangée** - `emitAsync()` / `emitSync()`
- **Configuration existante** continue de fonctionner
- **Aucun breaking change** pour les utilisateurs existants

#### Migration Optionnelle
Les handlers sont **additionnels** au système de notifications :
- **Notifications** → Communication externe (emails, webhooks, etc.)
- **Handlers** → Logique métier (analytics, audit, workflows, etc.)

### 📈 Statistiques v1.0.3

- **+8 nouveaux fichiers** pour le système d'handlers
- **+2000 lignes de code** pour les fonctionnalités handlers
- **Dual processing** : Notifications + Handlers en parallèle
- **Lifecycle complet** avec callbacks avant/après/erreur
- **Queue management avancé** avec priorités et retry policies
- **100% type-safe** avec interfaces TypeScript strictes

---

## [1.0.2] - 2025-01-18

### 🛠️ Corrections et Optimisations Mineures
- **Résolution des dépendances circulaires** avec forwardRef()
- **Nettoyage des fichiers** refactored et simple architecture
- **Stabilisation de l'architecture** post-v1.0.0
- **Amélioration de la configuration** EVENT_NOTIFICATIONS_CONFIG

---

## [1.0.0] - 2025-01-18

### 🚀 Nouvelles Fonctionnalités Majeures

#### Auto-découverte des Providers avec `@InjectableNotifier`
- **Nouveau décorateur `@InjectableNotifier`** pour l'enregistrement automatique des providers
- **Système `NotifierRegistry`** pour la découverte et gestion centralisée
- **Validation automatique** que les providers étendent `NotificationProviderBase`
- **Configuration simplifiée** : plus besoin de section `providers` manuelle

```typescript
@InjectableNotifier({
    channel: 'email',
    driver: 'smtp',
    description: 'Provider email SMTP'
})
export class EmailProvider extends NotificationProviderBase<'email'> {
    // Auto-découverte et enregistrement automatique !
}
```

#### Gestion Intelligente des Queues
- **Mode `api`** : Traitement immédiat uniquement
- **Mode `worker`** : Queue Redis obligatoire, traitement différé
- **Mode `hybrid`** : Queue si Redis disponible, sinon traitement immédiat
- **`QueueManagerService`** pour orchestration intelligente
- **Fallback automatique** si Redis indisponible

#### Worker en Processus Séparé
- **Worker standalone** avec `src/worker.ts` et `WorkerModule`
- **Scaling horizontal** : plusieurs workers en parallèle
- **Isolation des processus** : API et Worker indépendants
- **Configuration Docker** complète avec docker-compose
- **Scripts NPM dédiés** : `start:worker`, `start:worker:dev`, `start:both`

#### Type Safety Avancée avec Module Augmentation
- **Module augmentation automatique** pour les drivers
- **Union types intelligents** pour `AvailableDrivers`
- **Interface `DriverConfigurations`** extensible
- **Validation TypeScript** driver ↔ configuration

```typescript
// Type safety automatique
interface NotificationProviderConfig<T extends AvailableDrivers> {
    driver: T;
    config: DriverConfigurations[T]; // ✅ Type-safe !
}
```

### 🔧 Améliorations Architecture

#### Nouveaux Services Core
- **`NotificationOrchestratorService`** - Orchestration centralisée
- **`QueueManagerService`** - Gestion intelligente des queues
- **`NotifierRegistry`** - Registre des providers avec métadonnées

#### Configuration Simplifiée
- **Propriété `property` optionnelle** dans les providers
- **Méthode `getChannelName()`** récupère le channel depuis `@InjectableNotifier`
- **Suppression de la redondance** `channelName` vs `channel`
- **Configuration package simplifiée** sans section `providers`

#### Drivers Optimisés
- **Interface `DriverConfigurations`** pour extensibilité
- **Support module augmentation** pour nouveaux drivers
- **Validation de configuration** améliorée
- **Health checks** pour tous les drivers

### 📦 Déploiement et DevOps

#### Docker et Container Support
- **`Dockerfile.worker`** optimisé multi-stage
- **`docker-compose.yml`** avec API + Worker + Redis
- **Scaling avec profiles** : `--profile scaling` pour multiple workers
- **Redis Commander** pour monitoring : `--profile monitoring`
- **Variables d'environnement** complètes avec `.env.example`

#### Scripts et Outils
```json
{
  "start:worker": "node dist/worker",
  "start:worker:dev": "nest start worker --watch", 
  "start:both": "concurrently \"npm run start:dev\" \"npm run start:worker:dev\"",
  "example:advanced:worker": "npm --prefix examples/advanced-usage run start:worker"
}
```

### 📚 Documentation et Exemples

#### Documentation Complète
- **README principal** entièrement réécrit avec v1.0.0
- **Guide de migration** depuis v0.x
- **Exemples basic-usage** mis à jour avec auto-découverte
- **Guide Docker** et déploiement production
- **Monitoring et scaling** documentés

#### Exemple Advanced Usage (Nouveau)
- **Architecture microservices** avec API + Worker séparés
- **Configuration avancée** avec multiple environments
- **Monitoring et métriques** intégrés
- **Tests E2E** pour worker et API

### 🛠️ Corrections et Optimisations

#### Type Safety
- **Résolution des imports** pour driver configurations
- **Interfaces étendues** avec module augmentation
- **Validation runtime** des configurations
- **Typage strict** pour les événements et payloads

#### Performance
- **Auto-découverte au démarrage** (pas de runtime detection)
- **Registry en mémoire** pour accès O(1)
- **Queue optimisée** avec Bull Redis
- **Workers parallèles** sans conflit

#### Stabilité
- **Gestion d'erreurs robuste** dans le worker
- **Retry automatique** avec exponential backoff
- **Health checks** pour tous les composants
- **Logs structurés** par mode et composant

### ⚠️ Breaking Changes

#### Configuration
- **`providers` section obsolète** dans la configuration package
- **`channelName` supprimé** des providers (remplacé par `getChannelName()`)
- **Propriété `channel` obligatoire** dans `@InjectableNotifier`

#### API Changes
- **`this.channel` → `this.getChannelName()`** dans les providers
- **`@Injectable()` → `@InjectableNotifier()`** pour les providers
- **Interface `Recipient`** doit être étendue via module augmentation

### 🔄 Migration depuis v0.x

#### 1. Mettre à jour les Providers
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
    protected readonly property = 'email'; // Optionnel
}
```

#### 2. Simplifier la Configuration
```typescript
// Avant - Configuration manuelle complexe
providers: {
    email: { driver: 'smtp', config: {...} }
}

// Maintenant - Auto-découverte
// Plus besoin ! Les providers s'enregistrent automatiquement
```

#### 3. Utiliser `getChannelName()`
```typescript
// Avant
return { channel: this.channel }

// Maintenant  
return { channel: this.getChannelName() }
```

### 📊 Statistiques v1.0.0

- **+15 nouveaux fichiers** pour l'architecture worker
- **+500 lignes** de documentation mise à jour
- **3 nouveaux modes** de fonctionnement (api/worker/hybrid)
- **100% auto-découverte** des providers
- **Zero configuration** manuelle des providers
- **Scaling horizontal** infini avec workers
- **Type safety** complète avec module augmentation

---

## [0.1.0] - 2025-01-17

### Ajouté
- Version initiale de la librairie
- Support basique des drivers HTTP et SMTP
- Providers Email, Telegram, Webhook
- Configuration manuelle des providers
- RecipientLoader interface
- Tests unitaires de base

### Notes
Version initiale avec architecture de base fonctionnelle.