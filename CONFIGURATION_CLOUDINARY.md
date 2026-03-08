# ☁️ Configuration Cloudinary - Guide Pas à Pas

## 🎯 Ce que vous devez faire maintenant

Vous avez mentionné avoir un lien Cloudinary avec vos credentials. Voici comment les configurer.

---

## 📋 Étape 1 : Récupérer vos Credentials

### Option A : Depuis votre Dashboard Cloudinary

1. Allez sur [cloudinary.com/console](https://cloudinary.com/console)
2. Connectez-vous à votre compte
3. Sur la page d'accueil du Dashboard, vous verrez :

```
Account Details
├── Cloud name: votre_cloud_name
├── API Key: 123456789012345
└── API Secret: [Cliquez pour révéler]
```

### Option B : Depuis votre lien

Si vous avez un lien comme :
```
cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Décomposez-le ainsi :
- **Cloud Name** : La partie après `@`
- **API Key** : La partie entre `://` et `:`
- **API Secret** : La partie entre `:` et `@`

Exemple :
```
cloudinary://123456789012345:abcdefGHIJKLMNOP123456@mon-cloud-name

Cloud Name: mon-cloud-name
API Key: 123456789012345
API Secret: abcdefGHIJKLMNOP123456
```

---

## 📋 Étape 2 : Créer un Upload Preset

### Pourquoi ?
Un upload preset définit les paramètres d'upload (dossier, transformations, etc.)

### Comment ?

1. **Allez dans Settings** :
   - Dashboard > ⚙️ Settings (en haut à droite)

2. **Accédez à Upload** :
   - Dans le menu de gauche : Upload

3. **Créez un nouveau preset** :
   - Scrollez jusqu'à "Upload presets"
   - Cliquez sur "Add upload preset"

4. **Configurez le preset** :
   ```
   Preset name: neyshaplay_videos
   Signing Mode: Unsigned ⚠️ IMPORTANT
   Folder: neyshaplay/videos (optionnel)
   Resource type: Auto
   Access mode: Public
   ```

5. **Sauvegardez** :
   - Cliquez sur "Save"

⚠️ **IMPORTANT** : Le "Signing Mode" DOIT être "Unsigned" pour que l'upload fonctionne depuis le navigateur.

---

## 📋 Étape 3 : Configurer .env.local

### Ouvrez le fichier `.env.local`

Le fichier existe déjà à la racine du projet. Ouvrez-le et remplacez les valeurs :

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre_cloud_name_ici
NEXT_PUBLIC_CLOUDINARY_API_KEY=votre_api_key_ici
CLOUDINARY_API_SECRET=votre_api_secret_ici
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=neyshaplay_videos
```

### Exemple avec de vraies valeurs :

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=mon-cloud-name
NEXT_PUBLIC_CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefGHIJKLMNOP123456
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=neyshaplay_videos
```

⚠️ **Attention** :
- Pas d'espaces autour du `=`
- Pas de guillemets
- Respectez la casse (majuscules/minuscules)

---

## 📋 Étape 4 : Redémarrer le Serveur

### Dans le terminal où tourne `npm run dev` :

1. **Arrêtez le serveur** :
   - Appuyez sur `Ctrl + C`

2. **Relancez-le** :
   ```bash
   npm run dev
   ```

3. **Vérifiez** :
   - Le serveur devrait démarrer sur http://localhost:9002
   - Aucune erreur ne devrait apparaître

---

## ✅ Étape 5 : Tester

### Test 1 : Vérifier les variables

Ouvrez la console du navigateur (F12) et tapez :
```javascript
console.log(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
```

Vous devriez voir votre cloud name s'afficher.

### Test 2 : Créer une vidéo

1. Connectez-vous avec Google
2. Allez sur la page de création (icône +)
3. Enregistrez une courte vidéo (5 secondes)
4. Ajoutez une légende
5. Cliquez sur "Publier"

**Résultat attendu** :
- ✅ Vous êtes redirigé immédiatement vers le feed
- ✅ Un toast "Publication en cours..." apparaît
- ✅ Dans la console : "Video published successfully"
- ✅ La vidéo apparaît dans votre profil après quelques secondes

### Test 3 : Vérifier sur Cloudinary

1. Allez sur votre Dashboard Cloudinary
2. Cliquez sur "Media Library" (menu de gauche)
3. Vous devriez voir votre vidéo dans le dossier `neyshaplay/videos`

---

## 🐛 Dépannage

### Erreur : "Upload preset not found"

**Cause** : Le preset n'existe pas ou le nom est incorrect

**Solution** :
1. Vérifiez que le preset existe dans Cloudinary
2. Vérifiez l'orthographe dans `.env.local`
3. Redémarrez le serveur

### Erreur : "Invalid cloud name"

**Cause** : Le cloud name est incorrect

**Solution** :
1. Vérifiez le cloud name dans votre Dashboard
2. Pas d'espaces, pas de caractères spéciaux
3. Respectez la casse

### Erreur : "Unsigned upload not allowed"

**Cause** : Le preset n'est pas en mode "Unsigned"

**Solution** :
1. Allez dans Settings > Upload
2. Trouvez votre preset
3. Changez "Signing Mode" en "Unsigned"
4. Sauvegardez

### La vidéo ne s'upload pas

**Vérifications** :
1. Console du navigateur : Y a-t-il des erreurs ?
2. Network tab : L'appel à Cloudinary est-il fait ?
3. Variables d'environnement : Sont-elles bien chargées ?
4. Serveur : A-t-il été redémarré après modification de `.env.local` ?

### Variables d'environnement non chargées

**Solution** :
1. Vérifiez que le fichier s'appelle bien `.env.local` (pas `.env`)
2. Vérifiez qu'il est à la racine du projet
3. Redémarrez le serveur
4. Videz le cache du navigateur (Ctrl + Shift + R)

---

## 📊 Vérification Finale

### Checklist

- [ ] Compte Cloudinary créé
- [ ] Credentials récupérés (Cloud Name, API Key, API Secret)
- [ ] Upload preset créé en mode "Unsigned"
- [ ] Fichier `.env.local` configuré
- [ ] Serveur redémarré
- [ ] Variables d'environnement chargées (vérifiées dans la console)
- [ ] Test d'upload réussi
- [ ] Vidéo visible dans Cloudinary Media Library

---

## 🎉 Félicitations !

Si tous les tests passent, votre configuration Cloudinary est complète !

### Prochaines étapes :

1. **Testez l'application** : Créez plusieurs vidéos
2. **Explorez Cloudinary** : Découvrez les transformations
3. **Optimisez** : Configurez les paramètres de compression
4. **Sécurisez** : Pour la production, passez à un upload signé

---

## 📞 Besoin d'Aide ?

### Si vous êtes bloqué :

1. **Vérifiez la console** : Les erreurs y sont affichées
2. **Consultez les logs** : Terminal où tourne le serveur
3. **Relisez ce guide** : Avez-vous suivi toutes les étapes ?
4. **Documentation Cloudinary** : [cloudinary.com/documentation](https://cloudinary.com/documentation)

### Informations à fournir si vous demandez de l'aide :

- Message d'erreur exact
- Contenu de `.env.local` (SANS les secrets !)
- Logs de la console navigateur
- Logs du terminal serveur
- Étapes déjà effectuées

---

## 🔐 Sécurité

### ⚠️ IMPORTANT

- **NE COMMITEZ JAMAIS** le fichier `.env.local`
- **NE PARTAGEZ JAMAIS** votre API Secret
- Le `.env.local` est déjà dans `.gitignore`
- Pour la production, utilisez des variables d'environnement sécurisées

### Pour la production :

1. Utilisez un upload signé (plus sécurisé)
2. Créez un endpoint API pour signer les uploads
3. Limitez les uploads par utilisateur
4. Ajoutez une validation côté serveur

---

**Bonne configuration ! 🚀**

Si tout fonctionne, vous pouvez passer aux prochaines fonctionnalités (likes, commentaires, etc.)
