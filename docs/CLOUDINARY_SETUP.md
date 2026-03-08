# Configuration Cloudinary

## 📋 Étapes de Configuration

### 1. Créer un compte Cloudinary

1. Allez sur [cloudinary.com](https://cloudinary.com)
2. Créez un compte gratuit
3. Accédez à votre Dashboard

### 2. Récupérer vos credentials

Dans votre Dashboard Cloudinary, vous trouverez :
- **Cloud Name** : Votre nom de cloud unique
- **API Key** : Votre clé API
- **API Secret** : Votre secret API (gardez-le confidentiel!)

### 3. Créer un Upload Preset

1. Allez dans **Settings** > **Upload**
2. Cliquez sur **Add upload preset**
3. Configurez :
   - **Preset name** : `neyshaplay_videos` (ou autre nom)
   - **Signing Mode** : **Unsigned** (pour upload depuis le client)
   - **Folder** : `neyshaplay/videos` (optionnel)
   - **Resource type** : **Video**
   - **Access mode** : **Public**
4. Sauvegardez le preset

### 4. Configurer les variables d'environnement

Créez ou mettez à jour le fichier `.env.local` à la racine du projet :

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=neyshaplay_videos
```

⚠️ **Important** : 
- Ne commitez JAMAIS le fichier `.env.local`
- Le `.env.local` est déjà dans `.gitignore`
- Seules les variables préfixées par `NEXT_PUBLIC_` sont accessibles côté client

### 5. Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
# Relancer
npm run dev
```

## 🎯 Fonctionnalités Implémentées

### Upload Optimiste

L'application utilise une approche "optimistic UI" :

1. **Enregistrement de la vidéo** : L'utilisateur enregistre sa vidéo
2. **Prévisualisation** : L'utilisateur peut prévisualiser et ajouter une légende
3. **Publication instantanée** : 
   - L'utilisateur clique sur "Publier"
   - Il est immédiatement redirigé vers le feed
   - L'upload vers Cloudinary se fait en arrière-plan
   - La vidéo apparaît dans Firestore une fois l'upload terminé

### Avantages

- ✅ **Expérience utilisateur fluide** : Pas d'attente
- ✅ **Performance** : L'utilisateur peut continuer à naviguer
- ✅ **Fiabilité** : Cloudinary gère l'optimisation et la compression
- ✅ **CDN Global** : Vidéos servies rapidement partout dans le monde
- ✅ **Thumbnails automatiques** : Génération automatique des miniatures

## 🔧 Utilisation dans le Code

### Upload d'une vidéo

```typescript
import { uploadVideoToCloudinary, getVideoThumbnail } from '@/lib/cloudinary'

// Upload avec progression
const response = await uploadVideoToCloudinary(
  videoBlob,
  (progress) => {
    console.log(`Upload: ${progress}%`)
  }
)

// Récupérer l'URL de la vidéo
const videoUrl = response.secure_url

// Générer une miniature
const thumbnailUrl = getVideoThumbnail(response.public_id)
```

### Structure de la réponse Cloudinary

```typescript
{
  secure_url: string,        // URL HTTPS de la vidéo
  public_id: string,         // ID unique de la vidéo
  resource_type: 'video',
  format: 'mp4',            // Format de la vidéo
  width: number,            // Largeur en pixels
  height: number,           // Hauteur en pixels
  duration: number,         // Durée en secondes
}
```

## 📊 Optimisations Cloudinary

### Transformations d'URL

Cloudinary permet de transformer les vidéos via l'URL :

```typescript
// Miniature à 0 secondes, 400x600, remplissage
https://res.cloudinary.com/{cloud_name}/video/upload/so_0,w_400,h_600,c_fill/{public_id}.jpg

// Vidéo optimisée pour mobile
https://res.cloudinary.com/{cloud_name}/video/upload/q_auto,f_auto/{public_id}.mp4

// Vidéo avec watermark
https://res.cloudinary.com/{cloud_name}/video/upload/l_logo,g_south_east/{public_id}.mp4
```

### Paramètres de transformation

- `so_X` : Seek offset (position en secondes pour la miniature)
- `w_X` : Width (largeur)
- `h_X` : Height (hauteur)
- `c_fill` : Crop mode (remplissage)
- `q_auto` : Quality auto (optimisation automatique)
- `f_auto` : Format auto (meilleur format selon le navigateur)

## 🔒 Sécurité

### Upload Unsigned vs Signed

**Unsigned (actuel)** :
- ✅ Plus simple à implémenter
- ✅ Pas besoin de backend
- ⚠️ Limité par les paramètres du preset
- ⚠️ Tout le monde peut uploader (si le preset est connu)

**Signed (recommandé pour production)** :
- ✅ Plus sécurisé
- ✅ Contrôle total sur les uploads
- ⚠️ Nécessite un endpoint backend
- ⚠️ Plus complexe à implémenter

### Recommandations

Pour la production, implémentez un upload signé :

1. Créer un endpoint API Next.js : `/api/cloudinary/sign`
2. Générer une signature côté serveur
3. Utiliser la signature pour l'upload

```typescript
// pages/api/cloudinary/sign.ts
import { v2 as cloudinary } from 'cloudinary'

export default async function handler(req, res) {
  const timestamp = Math.round(new Date().getTime() / 1000)
  
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp: timestamp,
      folder: 'neyshaplay/videos'
    },
    process.env.CLOUDINARY_API_SECRET!
  )
  
  res.json({ signature, timestamp })
}
```

## 📈 Limites et Quotas

### Plan Gratuit Cloudinary

- **Stockage** : 25 GB
- **Bande passante** : 25 GB/mois
- **Transformations** : 25 000/mois
- **Vidéos** : Durée max 100 MB par fichier

### Surveillance

Surveillez votre usage dans le Dashboard Cloudinary :
- **Media Library** : Nombre de fichiers stockés
- **Usage** : Bande passante et transformations
- **Reports** : Statistiques détaillées

## 🐛 Dépannage

### Erreur : "Upload preset not found"

- Vérifiez que le preset existe dans Cloudinary
- Vérifiez que `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` est correct
- Vérifiez que le preset est en mode "Unsigned"

### Erreur : "Invalid cloud name"

- Vérifiez `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- Pas d'espaces ou caractères spéciaux

### Upload lent

- Vérifiez votre connexion internet
- Cloudinary compresse automatiquement, cela peut prendre du temps
- Considérez réduire la qualité d'enregistrement côté client

### Vidéo ne s'affiche pas

- Vérifiez que l'URL est correcte
- Vérifiez les règles CORS de Cloudinary
- Vérifiez que la vidéo est bien en mode "Public"

## 🔗 Ressources

- [Documentation Cloudinary](https://cloudinary.com/documentation)
- [Video Upload API](https://cloudinary.com/documentation/video_upload_api_reference)
- [Video Transformations](https://cloudinary.com/documentation/video_transformation_reference)
- [Upload Presets](https://cloudinary.com/documentation/upload_presets)

---

**Dernière mise à jour** : Mars 2026
