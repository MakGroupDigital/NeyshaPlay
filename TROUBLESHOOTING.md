# 🔧 Dépannage - NeyshaPlay

## 🐛 Problèmes Courants et Solutions

---

## 1. Erreur "Error fetching user for video"

### Symptôme
```
Error fetching user for video: CI5OBPfMIlnbhmsaXDkg
```

### Cause
Des vidéos de test existent dans Firestore avec des références utilisateurs invalides ou supprimées.

### Solution Rapide
L'application gère maintenant ces erreurs automatiquement et affiche "Utilisateur" pour les vidéos sans utilisateur valide.

### Solution Permanente (Recommandée)

#### Option 1 : Via Firebase Console (Plus Simple)

1. **Ouvrez Firebase Console**
   - [https://console.firebase.google.com](https://console.firebase.google.com)
   - Sélectionnez: `studio-4725166594-b0358`

2. **Accédez à Firestore**
   - Menu gauche > Firestore Database
   - Cliquez sur la collection `videos`

3. **Supprimez les vidéos de test**
   - Identifiez les vidéos avec des userRef invalides
   - Cliquez sur chaque document
   - Cliquez sur "Delete document"

4. **Rechargez l'application**
   - Rafraîchissez http://localhost:9002
   - Les erreurs devraient disparaître

#### Option 2 : Créer de Nouvelles Vidéos

1. **Connectez-vous à l'application**
   - Allez sur http://localhost:9002
   - Cliquez sur "Continuer avec Google"
   - Choisissez "Créateur"

2. **Créez une nouvelle vidéo**
   - Cliquez sur l'icône "+" en bas
   - Enregistrez une courte vidéo (5 secondes)
   - Publiez

3. **Les nouvelles vidéos auront des utilisateurs valides**

---

## 2. Erreur d'Hydratation (Hydration Mismatch)

### Symptôme
```
A tree hydrated but some attributes of the server rendered HTML 
didn't match the client properties
```

### Cause
Différence entre le HTML généré côté serveur et côté client, souvent due à :
- `localStorage` utilisé pendant le SSR
- Styles dynamiques ajoutés côté client
- Extensions de navigateur

### Solution
✅ **Déjà corrigé** dans la dernière version !

Le composant `AppGate` a été mis à jour pour :
- Détecter si on est côté client avec `isClient`
- Éviter d'accéder à `localStorage` pendant le SSR
- Afficher le splash screen pendant l'hydratation

### Si le problème persiste

1. **Videz le cache du navigateur**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

2. **Désactivez les extensions de navigateur**
   - Mode incognito pour tester
   - Désactivez les extensions qui modifient le DOM

3. **Redémarrez le serveur**
   ```bash
   # Arrêtez le serveur (Ctrl+C)
   npm run dev
   ```

---

## 3. Upload de Vidéo Échoue

### Symptôme
- La vidéo ne s'upload pas
- Erreur "Upload preset not found"
- Erreur "Invalid cloud name"

### Solutions

#### Vérifier les Variables d'Environnement

1. **Ouvrez `.env.local`**
   ```env
   CLOUDINARY_URL=cloudinary://828292343673526:d0YIaf2p_zJpruJKl3t9fisUqJI@doe4jempg
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=doe4jempg
   NEXT_PUBLIC_CLOUDINARY_API_KEY=828292343673526
   CLOUDINARY_API_SECRET=d0YIaf2p_zJpruJKl3t9fisUqJI
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=neyshaplay_videos
   ```

2. **Vérifiez qu'il n'y a pas d'espaces**

3. **Redémarrez le serveur**
   ```bash
   npm run dev
   ```

#### Vérifier l'Upload Preset

1. **Allez sur Cloudinary Dashboard**
   - [https://cloudinary.com/console](https://cloudinary.com/console)

2. **Vérifiez le preset**
   - Settings > Upload
   - Cherchez `neyshaplay_videos`
   - Vérifiez que "Signing Mode" est "Unsigned"

3. **Si le preset n'existe pas**
   ```bash
   npm run setup:cloudinary
   ```

---

## 4. Caméra Non Accessible

### Symptôme
- "Accès à la caméra refusé"
- La caméra ne s'affiche pas

### Solutions

1. **Autorisez la caméra dans le navigateur**
   - Chrome : Cliquez sur l'icône 🔒 dans la barre d'adresse
   - Autorisez la caméra et le microphone
   - Rechargez la page

2. **Vérifiez que la caméra fonctionne**
   - Testez avec une autre application
   - Vérifiez les paramètres système

3. **Utilisez HTTPS en production**
   - Les navigateurs modernes requièrent HTTPS pour la caméra
   - En local, `localhost` est autorisé

---

## 5. Règles Firestore Bloquent les Opérations

### Symptôme
- "Permission denied"
- "Missing or insufficient permissions"

### Solution

Les règles sont maintenant **permissives en développement** :

```
allow read, write: if true;
```

Si vous avez encore des erreurs :

1. **Vérifiez que les règles sont déployées**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Vérifiez dans Firebase Console**
   - Firestore Database > Rules
   - Vous devriez voir `allow read, write: if true;`

3. **Attendez 1-2 minutes**
   - Les règles prennent du temps à se propager

---

## 6. Port 9002 Déjà Utilisé

### Symptôme
```
Error: listen EADDRINUSE: address already in use :::9002
```

### Solution

```bash
# Tuez le processus sur le port 9002
lsof -ti:9002 | xargs kill -9

# Relancez le serveur
npm run dev
```

---

## 7. Erreurs de Build

### Symptôme
- Erreurs TypeScript pendant le build
- Erreurs ESLint

### Solution

Les erreurs sont **ignorées en développement** :

```typescript
// next.config.ts
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
}
```

Pour vérifier manuellement :
```bash
npm run typecheck  # Vérifier TypeScript
npm run lint       # Vérifier ESLint
```

---

## 8. Vidéos Ne Se Chargent Pas

### Symptôme
- Le feed est vide
- Spinner de chargement infini

### Solutions

1. **Vérifiez la connexion Firebase**
   - Ouvrez la console du navigateur
   - Cherchez des erreurs Firebase

2. **Vérifiez qu'il y a des vidéos**
   - Firebase Console > Firestore > Collection `videos`
   - Créez une vidéo de test si vide

3. **Vérifiez les règles Firestore**
   - Doivent permettre la lecture publique

---

## 9. Optimistic UI Ne Fonctionne Pas

### Symptôme
- Les likes ne se mettent pas à jour instantanément
- La publication attend l'upload complet

### Vérification

L'optimistic UI est **déjà implémenté** :

- **Likes** : Mise à jour instantanée, sync en arrière-plan
- **Publication** : Redirection immédiate, upload asynchrone
- **Profil** : Création en arrière-plan

Si ça ne fonctionne pas :

1. **Vérifiez la console**
   - Cherchez des erreurs JavaScript

2. **Videz le cache**
   - Ctrl + Shift + R

3. **Vérifiez la version**
   - Vous devriez être sur v0.2.0

---

## 10. Extensions de Navigateur Causent des Problèmes

### Symptôme
- Erreurs d'hydratation
- Comportement étrange de l'UI
- Styles cassés

### Solution

1. **Testez en mode incognito**
   - Ctrl + Shift + N (Chrome)
   - Cmd + Shift + N (Mac)

2. **Désactivez les extensions**
   - Particulièrement : Dark Reader, Grammarly, etc.

3. **Utilisez un navigateur propre**
   - Testez avec un profil vierge

---

## 📞 Besoin d'Aide ?

### Informations à Fournir

Quand vous demandez de l'aide, incluez :

1. **Message d'erreur exact**
   - Copiez depuis la console

2. **Étapes pour reproduire**
   - Qu'avez-vous fait avant l'erreur ?

3. **Environnement**
   - Navigateur et version
   - Système d'exploitation
   - Version de Node.js (`node --version`)

4. **Logs**
   - Console du navigateur (F12)
   - Terminal où tourne le serveur

### Commandes de Diagnostic

```bash
# Vérifier la version de Node
node --version

# Vérifier les dépendances
npm list --depth=0

# Vérifier TypeScript
npm run typecheck

# Vérifier les règles Firestore
firebase firestore:rules:get

# Tester Cloudinary
npm run setup:cloudinary
```

---

## 🔄 Réinitialisation Complète

Si rien ne fonctionne, réinitialisez tout :

```bash
# 1. Arrêtez le serveur (Ctrl+C)

# 2. Supprimez node_modules et .next
rm -rf node_modules .next

# 3. Réinstallez les dépendances
npm install

# 4. Vérifiez .env.local
cat .env.local

# 5. Redéployez les règles Firestore
firebase deploy --only firestore:rules

# 6. Relancez le serveur
npm run dev

# 7. Videz le cache du navigateur
# Ctrl + Shift + R
```

---

**Dernière mise à jour** : Mars 2026  
**Version** : 0.2.0
