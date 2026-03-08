# 🔥 Déployer les Règles Firestore

## ⚠️ Action Requise

Les règles Firestore ont été mises à jour pour permettre :
- Lecture publique des profils utilisateurs
- Lecture publique des vidéos
- Préparation pour les likes, commentaires et follows

## 📋 Option 1 : Via Firebase Console (Recommandé)

### Étapes :

1. **Ouvrez Firebase Console**
   - Allez sur [console.firebase.google.com](https://console.firebase.google.com)
   - Sélectionnez votre projet

2. **Accédez à Firestore**
   - Dans le menu de gauche : Firestore Database
   - Cliquez sur l'onglet "Rules"

3. **Copiez les nouvelles règles**
   - Ouvrez le fichier `firestore.rules` dans votre projet
   - Copiez tout le contenu

4. **Collez dans la console**
   - Collez le contenu dans l'éditeur de règles
   - Cliquez sur "Publish"

### Règles à copier :

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - public read, authenticated write
    match /users/{userId} {
      allow read: if true; // Public read pour afficher les profils dans les vidéos
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && request.auth.uid == userId;
    }

    // Videos collection - public read, authenticated write
    match /videos/{videoId} {
      allow read: if true; // Public read pour le feed
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userRef.id;
    }

    // Likes collection (à implémenter)
    match /likes/{likeId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }

    // Comments collection (à implémenter)
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }

    // Follows collection (à implémenter)
    match /follows/{followId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && 
        request.auth.uid == resource.data.followerId;
    }
  }
}
```

---

## 📋 Option 2 : Via Firebase CLI

### Prérequis :
```bash
npm install -g firebase-tools
firebase login
```

### Commandes :

1. **Initialiser Firebase (si pas déjà fait)**
   ```bash
   firebase init firestore
   ```
   - Sélectionnez votre projet
   - Utilisez `firestore.rules` comme fichier de règles

2. **Déployer les règles**
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## ✅ Vérification

Après le déploiement, vérifiez que :

1. **Les règles sont actives**
   - Dans Firebase Console > Firestore > Rules
   - Vous devriez voir les nouvelles règles

2. **L'application fonctionne**
   - Rechargez http://localhost:9002
   - Les vidéos devraient s'afficher sans erreur de permissions
   - Vérifiez la console : plus d'erreur "permission-denied"

---

## 🔒 Sécurité

### Ce qui est autorisé :

✅ **Lecture publique** :
- Profils utilisateurs (pour afficher dans les vidéos)
- Vidéos (pour le feed public)
- Likes, commentaires, follows (quand implémentés)

✅ **Écriture authentifiée** :
- Création de profil (seulement son propre profil)
- Création de vidéos (utilisateurs connectés)
- Modification/suppression (seulement son propre contenu)

### Ce qui est protégé :

🔒 **Modifications** :
- Un utilisateur ne peut modifier que son propre profil
- Un utilisateur ne peut supprimer que ses propres vidéos
- Un utilisateur ne peut supprimer que ses propres likes/commentaires

---

## 🐛 Problèmes Courants

### "Permission denied" persiste

**Solutions** :
1. Vérifiez que les règles sont bien déployées
2. Attendez 1-2 minutes (propagation)
3. Videz le cache du navigateur (Ctrl + Shift + R)
4. Vérifiez dans Firebase Console que les règles sont actives

### "Resource not found"

**Cause** : La collection n'existe pas encore

**Solution** : Créez au moins un document dans la collection

### "Invalid rule"

**Cause** : Erreur de syntaxe dans les règles

**Solution** : 
1. Vérifiez la syntaxe
2. Utilisez le simulateur de règles dans Firebase Console
3. Testez avec des données d'exemple

---

## 📝 Notes

### Pour le développement :

Les règles actuelles permettent la lecture publique pour faciliter le développement. C'est acceptable pour une application de type réseau social où le contenu est public.

### Pour la production :

Considérez d'ajouter :
- Rate limiting (via Cloud Functions)
- Validation des données plus stricte
- Logs d'audit
- Règles de quotas

---

## 🚀 Prochaines Étapes

Une fois les règles déployées :

1. ✅ Testez l'application
2. ✅ Vérifiez qu'il n'y a plus d'erreurs
3. ✅ Créez une vidéo de test
4. ✅ Vérifiez que tout fonctionne

Ensuite, vous pourrez implémenter :
- Système de likes persistant
- Commentaires
- Follow/Unfollow
- Notifications

---

**Important** : Déployez ces règles maintenant pour que l'application fonctionne correctement !
