# 📱 NeyshaPlay - Plateforme de Vidéos Courtes

NeyshaPlay est une application web moderne de partage de vidéos courtes, construite avec Next.js, React, Firebase et Cloudinary.

## ✨ Fonctionnalités

- 🎥 **Création de vidéos** : Enregistrez des vidéos jusqu'à 15 secondes avec filtres et effets
- 📱 **Feed immersif** : Défilement vertical infini de vidéos
- 🎨 **Filtres en temps réel** : 8 filtres visuels + contrôle de vitesse
- 👤 **Profils utilisateurs** : Deux types de comptes (Utilisateur / Créateur)
- 🔐 **Authentification Google** : Connexion simple et sécurisée
- ☁️ **Cloudinary** : Stockage et diffusion optimisés des vidéos
- ⚡ **Optimistic UI** : Interface ultra-réactive sans attente

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+ 
- npm ou yarn
- Compte Firebase
- Compte Cloudinary

### Installation

1. **Cloner le projet**
```bash
git clone [url-du-repo]
cd neyshaplay
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine :

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=votre_upload_preset
```

Voir [docs/CLOUDINARY_SETUP.md](./docs/CLOUDINARY_SETUP.md) pour plus de détails.

4. **Lancer l'application**
```bash
npm run dev
```

L'application sera accessible sur [http://localhost:9002](http://localhost:9002)

## 📚 Documentation

- [📖 Contexte du Projet](./docs/CONTEXTE_PROJET.md) - Architecture et vue d'ensemble
- [🚀 Fonctionnalités Futures](./docs/FONCTIONNALITES_FUTURES.md) - Roadmap et planification
- [☁️ Configuration Cloudinary](./docs/CLOUDINARY_SETUP.md) - Guide de configuration
- [📝 Changelog](./docs/CHANGELOG.md) - Historique des modifications
- [🎨 Blueprint](./docs/blueprint.md) - Spécifications de design

## 🛠️ Stack Technique

### Frontend
- **Framework** : Next.js 15.3.8 (App Router)
- **UI Library** : React 18.3.1
- **Styling** : Tailwind CSS 3.4.1 + shadcn/ui
- **Language** : TypeScript 5

### Backend & Services
- **Authentication** : Firebase Auth (Google)
- **Database** : Firebase Firestore
- **Storage** : Cloudinary
- **AI** : Google Genkit 1.20.0

### Outils
- **Package Manager** : npm
- **Bundler** : Turbopack
- **Linting** : ESLint
- **Type Checking** : TypeScript

## 📁 Structure du Projet

```
neyshaplay/
├── src/
│   ├── app/              # Pages Next.js (App Router)
│   │   ├── page.tsx      # Feed principal
│   │   ├── create/       # Création de vidéos
│   │   ├── discover/     # Découverte
│   │   ├── inbox/        # Notifications
│   │   ├── profile/      # Profil utilisateur
│   │   └── login/        # Authentification
│   ├── components/       # Composants réutilisables
│   │   ├── ui/          # Composants shadcn/ui
│   │   └── ...
│   ├── firebase/        # Configuration Firebase
│   ├── lib/             # Utilitaires et types
│   │   ├── cloudinary.ts # Gestion Cloudinary
│   │   ├── types.ts     # Types TypeScript
│   │   └── utils.ts     # Fonctions utilitaires
│   └── hooks/           # Hooks React personnalisés
├── docs/                # Documentation
├── public/              # Assets statiques
└── ...
```

## 🎯 Scripts Disponibles

```bash
npm run dev          # Serveur de développement (port 9002)
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linter ESLint
npm run typecheck    # Vérification TypeScript
npm run genkit:dev   # Serveur Genkit AI
npm run genkit:watch # Genkit en mode watch
```

## 🎨 Design System

### Couleurs
- **Background** : Deep Black (#121212)
- **Accent** : Neon Green (#8AFF00)
- **Text Primary** : Off-white (#E0E0E0)
- **Text Secondary** : Medium Gray (#A0A0A0)

### Typographie
- **Font** : Inter (Google Fonts)
- **Titres** : Inter Bold
- **Corps** : Inter Regular
- **UI** : Inter Medium

## 🔐 Authentification

L'application utilise uniquement l'authentification Google via Firebase :

1. L'utilisateur clique sur "Continuer avec Google"
2. Authentification via popup Google
3. Si nouveau : sélection du rôle (Utilisateur / Créateur)
4. Création automatique du profil dans Firestore
5. Redirection vers le feed

## 📹 Création de Vidéos

### Workflow

1. **Enregistrement** : Accès caméra avec filtres et effets
2. **Prévisualisation** : Vérification de la vidéo
3. **Publication** : Ajout de légende et hashtags
4. **Upload** : Envoi vers Cloudinary en arrière-plan
5. **Redirection** : Retour immédiat au feed (Optimistic UI)

### Fonctionnalités
- Caméra avant/arrière
- 8 filtres visuels
- Contrôle de vitesse (0.3x à 3x)
- Flash (si disponible)
- Lissage (blur)
- Durée max : 15 secondes

## ⚡ Optimistic UI

L'application utilise une approche "optimistic" pour une expérience ultra-réactive :

- **Likes** : Mise à jour instantanée, synchronisation en arrière-plan
- **Publication** : Redirection immédiate, upload asynchrone
- **Profil** : Création en arrière-plan lors de la première connexion

En cas d'erreur, l'interface effectue un rollback automatique.

## 🔮 Roadmap

### Phase 1 : Interactions Sociales (En cours)
- [ ] Système de likes persistant
- [ ] Commentaires
- [ ] Partage
- [ ] Follow/Unfollow
- [ ] Notifications push

### Phase 2 : Amélioration Création
- [ ] Bibliothèque de sons
- [ ] Effets visuels avancés
- [ ] Montage multi-clips

### Phase 3 : Découverte
- [ ] Algorithme de recommandation
- [ ] Recherche avancée
- [ ] Challenges et tendances

Voir [FONCTIONNALITES_FUTURES.md](./docs/FONCTIONNALITES_FUTURES.md) pour plus de détails.

## 🐛 Problèmes Connus

- TypeScript et ESLint ignorés en build (à corriger)
- Pas de tests unitaires/e2e
- Upload unsigned Cloudinary (à sécuriser pour production)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Privé - Tous droits réservés

## 📞 Contact

Pour toute question, créez une issue sur GitHub.

---

**Version** : 0.2.0  
**Dernière mise à jour** : Mars 2026
