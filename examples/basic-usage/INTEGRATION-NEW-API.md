# Intégration de la nouvelle API EventNotificationsModule

Ce document décrit les modifications apportées pour intégrer la nouvelle API du `EventNotificationsModule` avec le `FileQueueProvider`.

## ✅ Changements Apportés

### 1. Module Configuration (app.module.ts)

**Avant :**
```typescript
EventNotificationsModule.forRoot<MyAppEvents>(packageConfig)
```

**Après :**
```typescript
EventNotificationsModule.forRoot<MyAppEvents>({
  config: packageConfig,
  recipientLoader: StaticRecipientLoader
})
```

### 2. Extension de l'interface Recipient (static-recipient.loader.ts)

Ajout de l'extension d'interface pour supporter les propriétés spécifiques :

```typescript
// Extension de l'interface Recipient pour le StaticRecipientLoader
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        email?: string;
        firstName?: string;
        lastName?: string;
        telegramId?: string;
        webhookUrl?: string;
    }
}
```

### 3. FileQueueProvider par défaut

La nouvelle API utilise automatiquement le `FileQueueProvider` comme broker par défaut quand aucun `queueProvider` personnalisé n'est spécifié.

## 🎯 Avantages de la nouvelle API

### 1. **Configuration simplifiée**
- Plus besoin de configuration manuelle des tokens de provider
- RecipientLoader automatiquement injecté
- QueueProvider géré par factory

### 2. **Type Safety améliorée**
- Interface Recipient extensible via module augmentation
- Configuration typée avec les événements personnalisés

### 3. **FileQueueProvider intégré**
- Broker simple basé sur fichiers
- Aucune dépendance externe (Redis)
- Parfait pour développement et environnements simples
- Persistance automatique dans `./queue-data/`

## 📋 Tests Validés

### ✅ Test d'intégration basique
```bash
npx ts-node src/test-integration.ts
```

### ✅ Test avec configuration personnalisée
```bash
npx ts-node src/example-custom-queue.ts
```

### ✅ Test du FileQueueProvider standalone
```bash
npx ts-node src/test-file-queue.ts
```

## 🗂️ Structure des fichiers de queue

Le FileQueueProvider stocke les jobs dans des fichiers JSON :

```json
[
  {
    "id": "file-job-1751458285777-rpd6xekry",
    "name": "process-notification",
    "data": {
      "eventId": "evt_1751458285777_gzy9p5y10",
      "eventType": "order.created",
      "payload": { /* event payload */ }
    },
    "status": "completed",
    "attempts": 1,
    "result": [
      {
        "channel": "email",
        "provider": "EmailProvider", 
        "status": "sent",
        "metadata": { /* provider metadata */ }
      }
    ]
  }
]
```

## 🔧 Configuration Environnement

Variables d'environnement supportées :

```bash
# Répertoire de stockage des queues
QUEUE_DATA_DIR=./custom-queue-data

# Tokens pour les providers (optionnels)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
WEBHOOK_SECRET=your-webhook-secret
```

## 🚀 Migration

Pour migrer vers la nouvelle API :

1. **Mettre à jour la configuration du module**
   ```typescript
   // Remplacer
   EventNotificationsModule.forRoot(config)
   
   // Par
   EventNotificationsModule.forRoot({
     config: config,
     recipientLoader: YourRecipientLoader
   })
   ```

2. **Étendre l'interface Recipient si nécessaire**
   ```typescript
   declare module '@afidos/nestjs-event-notifications' {
       interface Recipient {
           yourCustomProperty?: string;
       }
   }
   ```

3. **Supprimer les providers manuels obsolètes**
   - Plus besoin de `RECIPIENT_LOADER_TOKEN` manuel
   - Plus besoin de `QUEUE_PROVIDER_TOKEN` manuel

## 📊 Résultats

- ✅ FileQueueProvider intégré et fonctionnel
- ✅ Configuration simplifiée
- ✅ Tests d'intégration passants
- ✅ Compatibilité maintenue avec l'API existante
- ✅ Performance optimisée (file-based queue)