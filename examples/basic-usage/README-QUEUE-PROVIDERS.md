# Guide des Queue Providers

Ce guide explique comment utiliser les différents providers de queue disponibles dans l'exemple basic-usage.

## 📁 FileQueueProvider (Par Défaut)

**Configuration actuelle** - Aucune installation requise

```typescript
// app.module.ts - Configuration actuelle
EventNotificationsModule.forRoot<MyAppEvents>({
  config: packageConfig,
  recipientLoader: StaticRecipientLoader
  // FileQueueProvider utilisé par défaut
})
```

### ✅ Avantages
- ✅ **Aucune dépendance** - Fonctionne out-of-the-box
- ✅ **Setup immédiat** - Pas de Redis à installer
- ✅ **Debug facile** - Jobs visibles dans `./queue-data/`
- ✅ **Parfait pour le développement** et tests

### ⚠️ Limitations
- ⚠️ **Performance limitée** - Recommandé pour < 1000 jobs/heure
- ⚠️ **Non distribué** - Un seul processus
- ⚠️ **Pas de dashboard** - Monitoring manuel

---

## 🔧 Bull Provider (Production Legacy)

**Fichier d'exemple:** `app-with-bull.module.example.ts`

### Installation

```bash
npm install bull @nestjs/bull redis
```

### Configuration Redis

```bash
# Docker
docker run -d -p 6379:6379 redis:alpine

# Variables d'environnement
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Usage

```typescript
import { BullModule } from '@nestjs/bull';
import { BullQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bull-queue.provider';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    EventNotificationsModule.forRoot<MyAppEvents>({
      config: packageConfig,
      recipientLoader: StaticRecipientLoader,
      queueProvider: BullQueueProvider
    })
  ]
})
```

### ✅ Avantages
- ✅ **Éprouvé en production** - Stabilité reconnue
- ✅ **Dashboard disponible** - Bull-board
- ✅ **Performance élevée** - Redis-based
- ✅ **Écosystème mature** - Nombreux plugins

### ⚠️ Limitations
- ⚠️ **Legacy** - Plus de développement actif
- ⚠️ **Dépendance Redis** - Infrastructure requise
- ⚠️ **API plus ancienne** - Moins moderne

---

## 🚀 BullMQ Provider (Production Moderne - RECOMMANDÉ)

**Fichier d'exemple:** `app-with-bullmq.module.example.ts`

### Installation

```bash
npm install bullmq @nestjs/bullmq redis
```

### Configuration Redis

```bash
# Docker simple
docker run -d -p 6379:6379 redis:alpine

# Docker production
docker run -d \
  --name redis-bullmq \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:alpine redis-server \
  --appendonly yes \
  --maxmemory 256mb \
  --maxmemory-policy allkeys-lru
```

### Usage

```typescript
import { BullModule } from '@nestjs/bullmq';
import { BullMQQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    EventNotificationsModule.forRoot<MyAppEvents>({
      config: packageConfig,
      recipientLoader: StaticRecipientLoader,
      queueProvider: BullMQQueueProvider
    })
  ]
})
```

### ✅ Avantages
- ✅ **Performance optimale** - Plus rapide que Bull
- ✅ **Architecture moderne** - TypeScript natif
- ✅ **Workers distribués** - Scalabilité élevée
- ✅ **Maintenance active** - Développement continu
- ✅ **API intuitive** - Meilleure DX

### ⚠️ Limitations
- ⚠️ **Dépendance Redis** - Infrastructure requise
- ⚠️ **Écosystème plus récent** - Moins de plugins

---

## 📊 Comparaison des Providers

| Critère | FileQueue | Bull | BullMQ |
|---------|-----------|------|--------|
| **Installation** | ❌ Aucune | 🔧 Bull + Redis | 🔧 BullMQ + Redis |
| **Performance** | 🟡 Légère | 🟢 Haute | 🟢 Très Haute |
| **Scalabilité** | ⚠️ Limitée | ✅ Élevée | ✅ Très Élevée |
| **Production** | ⚠️ < 1K jobs/h | ✅ Éprouvé | ✅ Moderne |
| **Maintenance** | ✅ Active | ⚠️ Legacy | ✅ Active |
| **Dashboard** | ❌ Aucun | ✅ Bull-board | ✅ BullMQ-board |
| **Setup** | ✅ Immédiat | 🔧 Moyen | 🔧 Moyen |

---

## 🎯 Recommandations d'Usage

### 🏠 Développement Local
```typescript
// ✅ Utilisez FileQueueProvider (configuration actuelle)
// Aucune installation, démarrage immédiat
EventNotificationsModule.forRoot({
  config: packageConfig,
  recipientLoader: StaticRecipientLoader
})
```

### 🧪 Tests Automatisés
```typescript
// ✅ FileQueueProvider recommandé
// Environnements temporaires sans Redis
```

### 📱 Applications Légères (< 1000 jobs/heure)
```typescript
// ✅ FileQueueProvider suffisant
// Production simple sans Redis
```

### 🏢 Applications Legacy avec Bull
```typescript
// ✅ Continuez avec Bull Provider
import { BullQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bull-queue.provider';
```

### 🚀 Nouvelles Applications Production
```typescript
// ✅ BullMQ Provider recommandé
import { BullMQQueueProvider } from '@afidos/nestjs-event-notifications/dist/queue/bullmq-queue.provider';
```

---

## 🔄 Migration Entre Providers

### De FileQueue vers BullMQ

1. **Installer BullMQ**
   ```bash
   npm install bullmq @nestjs/bullmq redis
   ```

2. **Configurer Redis**
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **Mettre à jour app.module.ts**
   ```typescript
   // Ajouter BullMQModule
   imports: [
     BullModule.forRoot({ connection: { host: 'localhost', port: 6379 } }),
     EventNotificationsModule.forRoot({
       config: packageConfig,
       recipientLoader: StaticRecipientLoader,
       queueProvider: BullMQQueueProvider  // ← Ajouter
     })
   ]
   ```

4. **Variables d'environnement**
   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### De Bull vers BullMQ

1. **Remplacer les dépendances**
   ```bash
   npm uninstall bull @nestjs/bull
   npm install bullmq @nestjs/bullmq
   ```

2. **Mettre à jour les imports**
   ```typescript
   // Remplacer
   import { BullModule } from '@nestjs/bull';
   import { BullQueueProvider } from '...';
   
   // Par
   import { BullModule } from '@nestjs/bullmq';
   import { BullMQQueueProvider } from '...';
   ```

---

## 🛠️ Debug et Monitoring

### FileQueueProvider
```bash
# Voir les jobs en cours
ls -la ./queue-data/
cat ./queue-data/basic-usage-notifications-queue.json | jq '.'
```

### Bull Provider
```bash
# Dashboard Bull-board
npm install bull-board
# Puis ajouter dans votre app
```

### BullMQ Provider
```bash
# Dashboard BullMQ-board
npm install @bull-board/api @bull-board/nestjs
# Configuration plus moderne
```

---

## ❓ FAQ

**Q: Puis-je changer de provider en production ?**
A: Oui, mais planifiez la migration avec attention. Arrêtez les workers, migrez les jobs en cours, puis redémarrez.

**Q: FileQueueProvider persiste-t-il les jobs en cas de crash ?**
A: Oui, les jobs sont sauvegardés dans des fichiers JSON et survivent aux redémarrages.

**Q: Quelle est la limite de FileQueueProvider ?**
A: Recommandé pour < 1000 jobs/heure. Au-delà, utilisez Redis.

**Q: Bull vs BullMQ pour une nouvelle app ?**
A: BullMQ est recommandé : plus moderne, performant et maintenu activement.