# 🧪 Test de l'Upload Cloudinary

## ✅ Ce qui a été implémenté

### 1. Module Cloudinary (`src/lib/cloudinary.ts`)
- ✅ Fonction `uploadVideoToCloudinary()` avec progression
- ✅ Fonction `getVideoThumbnail()` pour générer les miniatures
- ✅ Configuration depuis `.env.local`

### 2. Page Create (`src/app/create/page.tsx`)
- ✅ Upload vers Cloudinary (pas Firebase Storage)
- ✅ Optimistic UI : redirection immédiate
- ✅ Upload en arrière-plan
- ✅ Stockage du `cloudinaryPublicId` dans Firestore
- ✅ Protection : connexion requise

### 3. Variables d'Environnement (`.env.local`)
```env
CLOUDINARY_URL=cloudinary://828292343673526:d0YIaf2p_zJpruJKl3t9fisUqJI@doe4jempg
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=doe4jempg
NEXT_PUBLIC_CLOUDINARY_API_KEY=828292343673526
CLOUDINARY_API_SECRET=d0YIaf2p_zJpruJKl3t9fisUqJI
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=neyshaplay_videos
```

### 4. Upload Preset Cloudinary
- ✅ Créé automatiquement via `npm run setup:cloudinary`
- ✅ Nom : `neyshaplay_videos`
- ✅ Mode : Unsigned
- ✅ Dossier : `neyshaplay/videos`

---

## 🧪 Comment Tester

### Étape 1 : Vérifier la Configuration

```bash
# 1. Vérifier que les variables sont chargées
cat .env.local

# 2. Vérifier que le preset existe
npm run setup:cloudinary
```

**Résultat attendu** :
```
✅ Upload preset créé avec succès !
   Nom: neyshaplay_videos
   Mode: Unsigned
   Dossier: neyshaplay/videos
```

Ou :
```
ℹ️  Upload preset existe déjà.
```

---

### Étape 2 : Tester l'Application

#### 2.1 Connexion

1. **Ouvrez l'application**
   - http://localhost:9002

2. **Connectez-vous**
   - Cliquez sur "Continuer avec Google"
   - Choisissez votre compte
   - Sélectionnez "Créateur" (pour pouvoir créer des vidéos)

#### 2.2 Créer une Vidéo

1. **Accédez à la création**
   - Cliquez sur l'icône "+" en bas de l'écran
   - Ou allez directement sur http://localhost:9002/create

2. **Autorisez la caméra**
   - Le navigateur demandera l'accès à la caméra
   - Cliquez sur "Autoriser"

3. **Enregistrez une vidéo**
   - Appuyez sur le bouton rouge pour commencer
   - Enregistrez 5-10 secondes
   - Appuyez à nouveau pour arrêter

4. **Prévisualisez**
   - La vidéo devrait se lire en boucle
   - Cliquez sur "Suivant"

5. **Publiez**
   - Ajoutez une légende (optionnel) : "Test upload Cloudinary 🚀"
   - Cliquez sur "Publier"

#### 2.3 Vérifier le Comportement

**Ce qui devrait se passer** :

1. ✅ **Redirection immédiate**
   - Vous êtes redirigé vers le feed (`/`)
   - Pas d'attente de l'upload

2. ✅ **Toast de confirmation**
   - Message : "Publication en cours..."
   - Description : "Votre vidéo est en cours de téléversement..."

3. ✅ **Upload en arrière-plan**
   - Ouvrez la console (F12)
   - Vous devriez voir : "Video published successfully"

---

### Étape 3 : Vérifier sur Cloudinary

1. **Ouvrez Cloudinary Dashboard**
   - https://cloudinary.com/console

2. **Accédez à Media Library**
   - Menu gauche > Media Library

3. **Vérifiez le dossier**
   - Ouvrez le dossier `neyshaplay/videos`
   - Votre vidéo devrait y être !

4. **Vérifiez les détails**
   - Cliquez sur la vidéo
   - Vous devriez voir :
     - Format : webm ou mp4
     - Durée : ~5-10 secondes
     - Public ID : quelque chose comme `neyshaplay/videos/xxxxx`

---

### Étape 4 : Vérifier dans Firestore

1. **Ouvrez Firebase Console**
   - https://console.firebase.google.com
   - Projet : `studio-4725166594-b0358`

2. **Accédez à Firestore**
   - Menu gauche > Firestore Database

3. **Ouvrez la collection `videos`**
   - Votre nouvelle vidéo devrait être là

4. **Vérifiez les champs**
   ```
   videoUrl: https://res.cloudinary.com/doe4jempg/video/upload/...
   thumbnailUrl: https://res.cloudinary.com/doe4jempg/video/upload/so_0,w_400,h_600,c_fill/...
   cloudinaryPublicId: neyshaplay/videos/xxxxx
   description: "Test upload Cloudinary 🚀"
   userRef: Reference to users/[your-uid]
   createdAt: Timestamp
   ```

---

### Étape 5 : Vérifier dans le Feed

1. **Retournez au feed**
   - http://localhost:9002

2. **Votre vidéo devrait apparaître**
   - Scrollez si nécessaire
   - La vidéo devrait se lire automatiquement

3. **Vérifiez les détails**
   - Votre nom d'utilisateur
   - La légende
   - Les boutons (like, comment, share)

---

## 🐛 Dépannage

### Problème : "Connexion requise"

**Cause** : Vous n'êtes pas connecté

**Solution** :
1. Allez sur http://localhost:9002/login
2. Connectez-vous avec Google
3. Choisissez "Créateur"
4. Réessayez

---

### Problème : "Upload preset not found"

**Cause** : Le preset n'existe pas sur Cloudinary

**Solution** :
```bash
npm run setup:cloudinary
```

Si ça ne fonctionne pas :
1. Allez sur Cloudinary Dashboard
2. Settings > Upload
3. Créez manuellement le preset `neyshaplay_videos`
4. Mode : Unsigned

---

### Problème : "Invalid cloud name"

**Cause** : Variables d'environnement incorrectes

**Solution** :
1. Vérifiez `.env.local`
2. Cloud name doit être : `doe4jempg`
3. Redémarrez le serveur

---

### Problème : La vidéo ne s'affiche pas dans le feed

**Causes possibles** :
1. Upload encore en cours (attendez 10-30 secondes)
2. Erreur pendant l'upload (vérifiez la console)
3. Règles Firestore bloquent la lecture

**Solutions** :
1. Attendez un peu et rechargez
2. Vérifiez la console : F12 > Console
3. Vérifiez les règles Firestore (doivent être permissives)

---

### Problème : Erreur dans la console

**Erreur** : `Failed to fetch`

**Cause** : Problème réseau ou Cloudinary

**Solution** :
1. Vérifiez votre connexion internet
2. Vérifiez que Cloudinary est accessible
3. Réessayez

---

**Erreur** : `Permission denied`

**Cause** : Règles Firestore trop strictes

**Solution** :
```bash
firebase deploy --only firestore:rules
```

---

## ✅ Checklist de Vérification

Avant de tester, assurez-vous que :

- [ ] `.env.local` est configuré avec vos credentials Cloudinary
- [ ] Le serveur est démarré (`npm run dev`)
- [ ] Vous êtes connecté avec Google
- [ ] Votre compte est de type "Créateur"
- [ ] La caméra est autorisée dans le navigateur
- [ ] Les règles Firestore sont permissives (développement)
- [ ] L'upload preset existe sur Cloudinary

---

## 📊 Résultat Attendu

### Workflow Complet

```
1. Utilisateur enregistre vidéo (5-10s)
   ↓
2. Prévisualisation
   ↓
3. Ajout de légende
   ↓
4. Clic sur "Publier"
   ↓
5. Redirection immédiate vers /
   ↓
6. Upload vers Cloudinary en arrière-plan
   ↓
7. Création du document Firestore
   ↓
8. Vidéo apparaît dans le feed
```

### Temps Estimés

- Enregistrement : 5-10 secondes
- Prévisualisation : instantané
- Publication (redirection) : instantané
- Upload Cloudinary : 5-30 secondes (en arrière-plan)
- Apparition dans le feed : 1-2 secondes après l'upload

---

## 🎉 Succès !

Si tout fonctionne :

1. ✅ La vidéo est sur Cloudinary
2. ✅ Le document est dans Firestore
3. ✅ La vidéo apparaît dans le feed
4. ✅ L'expérience est fluide (pas d'attente)

**Félicitations ! L'intégration Cloudinary fonctionne parfaitement ! 🚀**

---

## 📝 Notes

### Différences avec Firebase Storage

**Avant (Firebase Storage)** :
- Upload lent
- Pas de CDN global
- Pas de transformations automatiques
- Limites de bande passante

**Après (Cloudinary)** :
- Upload optimisé
- CDN global (rapide partout)
- Transformations automatiques (miniatures, compression)
- Plan gratuit généreux (25 GB)

### Optimistic UI

L'application utilise une approche "optimistic" :
- L'utilisateur ne voit pas l'upload
- Redirection immédiate
- Upload en arrière-plan
- Meilleure expérience utilisateur

---

**Dernière mise à jour** : Mars 2026  
**Version** : 0.2.0
