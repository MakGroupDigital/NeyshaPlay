# 📱 NeyshaPlay - Documentation de Contexte du Projet

## 🎯 Vue d'ensemble

**NeyshaPlay** est une application web de partage de vidéos courtes, similaire à TikTok, construite avec Next.js 15, React 18, Firebase et Tailwind CSS. L'application permet aux utilisateurs de créer, partager et découvrir des contenus vidéo captivants dans un environnement immersif en mode sombre.

## 🏗️ Architecture Technique

### Stack Technologique

- **Framework**: Next.js 15.3.8 (App Router)
- **UI**: React 18.3.1
- **Styling**: Tailwind CSS 3.4.1 + shadcn/ui
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **AI**: Google Genkit 1.20.0
- **Langage**: TypeScript 5
- **Validation**: Zod 3.24.2
- **Formulaires**: React Hook Form 7.54.2

### Structure du Projet

```
src/
├── app/                    # Pages Next.js (App Router)
│   ├── page.tsx           # Feed principal de vidéos
│   ├── create/            # Création de vidéos
│   ├── discover/          # Découverte de contenus
│   ├── inbox/             # Notifications et messages
│   ├── profile/           # Profil utilisateur
│   └── login/             # Authentification
├── components/            # Composants réutilisables
│   ├── ui/               # Composants shadcn/ui
│   ├── layout/           # Composants de mise en page
│   └── video-card.tsx    # Carte vidéo principale
├── firebase/             # Configuration et hooks Firebase
│   ├── auth/            # Hooks d'authentification
│   ├── firestore/       # Hooks Firestore
│   └── config.ts        # Configuration Firebase
├── lib/                 # Utilitaires et types
│   ├── types.ts        # Types TypeScript
│   ├── data.ts         # Données mock
│   └── utils.ts        # Fonctions utilitaires
├── hooks/              # Hooks React personnalisés
└── ai/                 # Configuration Genkit AI
```

## 🎨 Design System

### Palette de Couleurs

- **Background Principal**: Deep Black (#121212)
- **Accent**: Neon Green (#8AFF00)
- **Texte Principal**: Off-white (#E0E0E0)
- **Texte Secondaire**: Medium Gray (#A0A0A0)

### Typographie

- **Police**: Inter (Google Fonts)
- **Titres**: Inter Bold
- **Corps**: Inter Regular
- **UI/Boutons**: Inter Medium

### Principes de Design

- Mode sombre uniquement
- Icônes minimalistes avec effet de lueur néon
- Coins arrondis (8px-12px border-radius)
- Effet "glow" sur les éléments importants
- Interface immersive et premium

## 📊 Modèles de Données

### User (Utilisateur)

```typescript
{
  id: string
  name: string
  username: string
  avatarUrl: string
  following: number
  followers: number
  likes: number
  bio: string
  role: 'user' | 'creator'
}
```

### Video

```typescript
{
  id: string
  user: User
  userRef: DocumentReference
  videoUrl: string
  thumbnailUrl: string
  description: string
  song: string
  likes: number
  comments: number
  shares: number
  createdAt: Timestamp
  filter?: string
}
```

### Notification

```typescript
{
  id: string
  user: Pick<User, 'name' | 'username' | 'avatarUrl'>
  type: 'like' | 'follow' | 'comment'
  content: string
  timestamp: string
  read: boolean
}
```

## 🔥 Configuration Firebase

### Services Utilisés

- **Authentication**: Gestion des utilisateurs
- **Firestore**: Base de données NoSQL
- **Storage**: Stockage des vidéos et images
- **Hosting**: Déploiement (via App Hosting)

### Collections Firestore

- `users`: Profils utilisateurs
- `videos`: Métadonnées des vidéos
- `notifications`: Notifications utilisateurs (à implémenter)

## ✨ Fonctionnalités Principales

### 1. Feed de Vidéos (/)
- Défilement vertical infini
- Lecture automatique des vidéos
- Affichage des informations utilisateur
- Statistiques (likes, commentaires, partages)

### 2. Création de Vidéos (/create)
- Accès à la caméra (avant/arrière)
- Enregistrement vidéo (max 15 secondes)
- Filtres en temps réel (8 filtres disponibles)
- Contrôle de vitesse (0.3x à 3x)
- Flash et lissage
- Prévisualisation avant publication
- Upload vers Firebase Storage
- Ajout de légende et hashtags

### 3. Découverte (/discover)
- Barre de recherche
- Hashtags tendances
- Grille de vidéos populaires
- Navigation par catégories

### 4. Boîte de Réception (/inbox)
- Onglet Activité (likes, follows, commentaires)
- Onglet Messages (messagerie directe)
- Indicateurs de lecture

### 5. Profil (/profile)
- Informations utilisateur
- Statistiques (abonnements, abonnés, likes)
- Grille de vidéos publiées
- Édition de profil

### 6. Authentification (/login)
- Connexion Firebase
- Gestion de session
- Protection des routes

## 🔐 Sécurité

### Règles Firestore (`firestore.rules`)
- Contrôle d'accès aux collections
- Validation des données
- Protection contre les écritures non autorisées

### Règles Storage (`storage.rules`)
- Restriction d'upload aux utilisateurs authentifiés
- Validation des types de fichiers
- Limites de taille

## 🚀 Scripts Disponibles

```bash
npm run dev          # Serveur de développement (port 9002)
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linter ESLint
npm run typecheck    # Vérification TypeScript
npm run genkit:dev   # Serveur Genkit AI
npm run genkit:watch # Genkit en mode watch
```

## 📦 Dépendances Clés

### UI & Styling
- `@radix-ui/*`: Composants accessibles
- `tailwindcss`: Framework CSS
- `lucide-react`: Icônes
- `class-variance-authority`: Gestion des variants
- `tailwind-merge`: Fusion de classes

### Firebase
- `firebase`: SDK Firebase complet

### Formulaires & Validation
- `react-hook-form`: Gestion de formulaires
- `zod`: Validation de schémas
- `@hookform/resolvers`: Intégration Zod

### AI
- `@genkit-ai/google-genai`: Intégration Google AI
- `@genkit-ai/next`: Intégration Next.js

## 🎯 Prochaines Fonctionnalités à Implémenter

### Phase 1: Interactions Sociales
- [ ] Système de likes en temps réel
- [ ] Commentaires sur les vidéos
- [ ] Partage de vidéos
- [ ] Système de follow/unfollow
- [ ] Notifications push

### Phase 2: Amélioration Création
- [ ] Bibliothèque de sons
- [ ] Effets visuels avancés
- [ ] Transitions entre clips
- [ ] Texte et stickers
- [ ] Duos et réactions

### Phase 3: Découverte & Engagement
- [ ] Algorithme de recommandation
- [ ] Recherche avancée
- [ ] Catégories personnalisées
- [ ] Challenges et tendances
- [ ] Analytics créateur

### Phase 4: Messagerie
- [ ] Chat en temps réel
- [ ] Envoi de médias
- [ ] Groupes de discussion
- [ ] Appels vidéo

### Phase 5: Monétisation
- [ ] Programme créateur
- [ ] Dons et tips
- [ ] Publicités
- [ ] Abonnements premium

## 🐛 Problèmes Connus

- TypeScript et ESLint ignorés en build (à corriger)
- Pas de gestion d'erreur globale
- Pas de tests unitaires/e2e
- Pas de CI/CD configuré

## 📝 Notes de Développement

### Configuration Next.js
- Turbopack activé en développement
- Port personnalisé: 9002
- Images externes autorisées (Cloudinary, Unsplash, Picsum)

### Firebase
- Configuration auto-générée par Firebase Studio
- Ne pas modifier `src/firebase/config.ts` manuellement

### Styling
- Mode sombre forcé (`className="dark"`)
- Utilisation de CSS variables pour les couleurs
- Composants shadcn/ui personnalisés

## 🔄 Workflow de Développement

1. Créer une branche feature
2. Développer la fonctionnalité
3. Tester localement
4. Vérifier les types (`npm run typecheck`)
5. Commit et push
6. Déploiement automatique via Firebase

## 📚 Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Genkit AI](https://firebase.google.com/docs/genkit)

---

**Dernière mise à jour**: Mars 2026
**Version**: 0.1.0
**Statut**: En développement actif
