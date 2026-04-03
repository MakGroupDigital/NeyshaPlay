# Configuration des Index Firestore

## 🔥 Problème

L'erreur suivante apparaît lors de l'utilisation de la fonctionnalité "Top Créateurs":

```
FirebaseError: The query requires an index.
```

Cela signifie que Firestore a besoin d'index composites pour effectuer des requêtes complexes avec plusieurs filtres et tris.

## 📋 Index requis

Les index suivants sont nécessaires pour le bon fonctionnement de l'application:

### 1. Top Créateurs par genre
**Collection**: `users`
**Champs**:
- `role` (ASCENDING)
- `gender` (ASCENDING)  
- `likes` (DESCENDING)

**Utilisation**: Récupérer les top créateurs/créatrices selon le sexe

### 2. Top Créateurs (fallback)
**Collection**: `users`
**Champs**:
- `role` (ASCENDING)
- `likes` (DESCENDING)

**Utilisation**: Récupérer les top créateurs sans filtre de genre

### 3. Vidéos par utilisateur
**Collection**: `videos`
**Champs**:
- `userRef` (ASCENDING)
- `createdAt` (DESCENDING)

**Utilisation**: Récupérer les vidéos d'un utilisateur triées par date

## 🚀 Méthodes de création

### Méthode 1: Via le lien direct (Recommandé)

Cliquez simplement sur le lien fourni dans l'erreur:

```
https://console.firebase.google.com/v1/r/project/studio-4725166594-b0358/firestore/indexes?create_composite=...
```

Firebase créera automatiquement l'index requis.

### Méthode 2: Via Firebase CLI

1. **Déployer tous les index**:
   ```bash
   ./scripts/deploy-firestore-indexes.sh
   ```

   Ou manuellement:
   ```bash
   firebase deploy --only firestore:indexes
   ```

2. **Attendre la création** (quelques minutes)

3. **Vérifier le statut**:
   - Aller sur [Firebase Console](https://console.firebase.google.com/project/studio-4725166594-b0358/firestore/indexes)
   - Vérifier que les index sont "Enabled" (vert)

### Méthode 3: Via la Console Firebase (Manuel)

1. **Aller sur Firebase Console**:
   - https://console.firebase.google.com/project/studio-4725166594-b0358/firestore/indexes

2. **Créer un index composite**:
   - Cliquer sur "Create Index"
   - Collection: `users`
   - Ajouter les champs:
     - `role` → Ascending
     - `gender` → Ascending
     - `likes` → Descending
   - Query scope: Collection
   - Cliquer sur "Create"

3. **Répéter pour les autres index**

## ⏱️ Temps de création

- **Petite base de données** (< 1000 documents): 1-2 minutes
- **Base moyenne** (1000-10000 documents): 5-10 minutes
- **Grande base** (> 10000 documents): 15-30 minutes

## 🔍 Vérification

Pour vérifier que les index sont créés:

1. **Via Firebase Console**:
   - Aller sur Firestore → Indexes
   - Vérifier que le statut est "Enabled" (vert)

2. **Via l'application**:
   - Recharger la page
   - Le header devrait afficher les top créateurs
   - Aucune erreur dans la console

## 📝 Fichier de configuration

Le fichier `firestore.indexes.json` contient la définition de tous les index:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "gender", "order": "ASCENDING" },
        { "fieldPath": "likes", "order": "DESCENDING" }
      ]
    },
    ...
  ]
}
```

## 🐛 Dépannage

### Erreur: "Index already exists"
- L'index existe déjà, attendez qu'il soit complètement créé
- Vérifiez le statut dans la console

### Erreur: "Permission denied"
- Vérifiez que vous êtes connecté: `firebase login`
- Vérifiez que vous avez les droits sur le projet

### L'index ne se crée pas
- Vérifiez votre connexion Internet
- Attendez quelques minutes de plus
- Essayez de recréer l'index via la console

### Les top créateurs ne s'affichent toujours pas
- Vérifiez que les utilisateurs ont le champ `gender` dans Firestore
- Vérifiez que les utilisateurs ont le champ `role` = 'creator'
- Vérifiez que les utilisateurs ont des `likes` > 0

## 🔄 Mise à jour des données existantes

Si vous avez des utilisateurs existants sans les champs `gender` et `feedGender`, créez un script de migration:

```javascript
// scripts/migrate-users.js
const admin = require('firebase-admin');

async function migrateUsers() {
  const usersRef = admin.firestore().collection('users');
  const snapshot = await usersRef.get();
  
  const batch = admin.firestore().batch();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.gender) {
      batch.update(doc.ref, {
        gender: 'male', // ou 'female' par défaut
        feedGender: 'all'
      });
    }
  });
  
  await batch.commit();
  console.log('Migration completed!');
}
```

## 📚 Ressources

- [Documentation Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Composite Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview#composite_indexes)
- [Index Best Practices](https://firebase.google.com/docs/firestore/query-data/indexing#best_practices)

## ✅ Checklist

Avant de continuer:

- [ ] Cliquer sur le lien d'erreur pour créer l'index automatiquement
- [ ] OU déployer via CLI: `firebase deploy --only firestore:indexes`
- [ ] Attendre que l'index soit "Enabled" dans la console
- [ ] Recharger l'application
- [ ] Vérifier que les top créateurs s'affichent dans le header
- [ ] Vérifier qu'il n'y a plus d'erreur dans la console

---

**Note**: Les index sont créés une seule fois et persistent. Vous n'aurez pas besoin de les recréer à chaque déploiement.
