# Changelog - NeyshaPlay

Toutes les modifications notables du projet sont documentées dans ce fichier.

---

## [0.2.0] - Mars 2026

### 🎉 Nouvelles Fonctionnalités

#### Authentification Google Uniquement
- ✅ Suppression de toutes les méthodes d'authentification sauf Google
- ✅ Interface de connexion simplifiée et épurée
- ✅ Expérience utilisateur plus fluide

#### Sélection du Rôle Utilisateur
- ✅ Nouveau composant `RoleSelection` pour choisir entre "Utilisateur" et "Créateur"
- ✅ Affichage lors de la première connexion uniquement
- ✅ Stockage du rôle dans Firestore
- ✅ Interface visuelle attrayante avec cartes interactives
- ✅ Descriptions claires des fonctionnalités de chaque rôle

#### Migration vers Cloudinary
- ✅ Remplacement de Firebase Storage par Cloudinary
- ✅ Upload optimisé avec barre de progression
- ✅ Génération automatique de miniatures
- ✅ CDN global pour une diffusion rapide
- ✅ Transformations d'images/vidéos à la volée
- ✅ Stockage du `cloudinaryPublicId` dans Firestore

#### Optimistic UI (Interface Optimiste)
- ✅ **Création de vidéo** : Redirection immédiate après publication
- ✅ **Likes** : Mise à jour instantanée de l'interface
- ✅ **Profil** : Création de profil en arrière-plan
- ✅ Upload en arrière-plan sans bloquer l'utilisateur
- ✅ Gestion des erreurs avec rollback automatique

### 🔧 Améliorations Techniques

#### Performance
- ⚡ Réduction du temps d'attente perçu grâce à l'optimistic UI
- ⚡ Upload asynchrone des vidéos
- ⚡ Chargement plus rapide des vidéos via Cloudinary CDN
- ⚡ Mise en cache automatique des ressources

#### Types TypeScript
- 📝 Ajout du type `UserRole` pour 'user' | 'creator'
- 📝 Extension du type `User` avec `email` et `createdAt`
- 📝 Ajout de `cloudinaryPublicId` dans le type `Video`
- 📝 Nouvelles interfaces pour Cloudinary

#### Architecture
- 🏗️ Nouveau module `src/lib/cloudinary.ts` pour la gestion Cloudinary
- 🏗️ Composant réutilisable `RoleSelection`
- 🏗️ Séparation des préoccupations (upload, auth, UI)
- 🏗️ Meilleure gestion des états asynchrones

### 📚 Documentation

#### Nouveaux Documents
- 📖 `CLOUDINARY_SETUP.md` : Guide complet de configuration Cloudinary
- 📖 `CHANGELOG.md` : Ce fichier, historique des modifications
- 📖 Mise à jour de `CONTEXTE_PROJET.md` avec les nouvelles fonctionnalités
- 📖 Mise à jour de `FONCTIONNALITES_FUTURES.md`

#### Améliorations Documentation
- 📝 Instructions détaillées pour la configuration Cloudinary
- 📝 Exemples de code pour l'upload
- 📝 Guide de dépannage
- 📝 Bonnes pratiques de sécurité

### 🔒 Sécurité

- 🔐 Variables d'environnement pour les secrets Cloudinary
- 🔐 `.env.local` dans `.gitignore`
- 🔐 Séparation des clés publiques et privées
- 🔐 Upload unsigned pour simplifier (à sécuriser en production)

### 🐛 Corrections de Bugs

- 🐛 Correction de la gestion des erreurs d'authentification
- 🐛 Amélioration de la détection de la caméra frontale
- 🐛 Correction du problème de lecture automatique des vidéos
- 🐛 Meilleure gestion des permissions caméra

### 🗑️ Suppressions

- ❌ Authentification par email/mot de passe
- ❌ Authentification par téléphone
- ❌ Authentification anonyme
- ❌ Dépendance à Firebase Storage pour les vidéos
- ❌ Code mort et composants inutilisés

### 📦 Dépendances

#### Ajoutées
- `cloudinary` : ^1.x.x - SDK Cloudinary pour Node.js

#### Mises à jour
- Aucune mise à jour de dépendances existantes

---

## [0.1.0] - Mars 2026

### 🎉 Version Initiale

#### Fonctionnalités de Base
- ✅ Feed de vidéos avec défilement vertical
- ✅ Lecture automatique des vidéos
- ✅ Création de vidéos avec caméra
- ✅ Filtres en temps réel (8 filtres)
- ✅ Contrôle de vitesse (0.3x à 3x)
- ✅ Page de découverte
- ✅ Profil utilisateur
- ✅ Authentification Firebase (multiple méthodes)
- ✅ Upload vers Firebase Storage

#### Stack Technique
- Next.js 15.3.8
- React 18.3.1
- TypeScript 5
- Tailwind CSS 3.4.1
- Firebase (Auth, Firestore, Storage)
- shadcn/ui

---

## 🔮 Prochaines Versions

### [0.3.0] - Planifié

#### Interactions Sociales
- [ ] Système de likes persistant dans Firestore
- [ ] Système de commentaires
- [ ] Système de partage
- [ ] Follow/Unfollow
- [ ] Notifications push

#### Améliorations Création
- [ ] Bibliothèque de sons
- [ ] Effets visuels avancés
- [ ] Montage multi-clips

### [0.4.0] - Planifié

#### Découverte & Engagement
- [ ] Algorithme de recommandation avec Genkit AI
- [ ] Recherche avancée
- [ ] Challenges et tendances

### [0.5.0] - Planifié

#### Messagerie
- [ ] Chat en temps réel
- [ ] Envoi de médias
- [ ] Groupes de discussion

---

## 📝 Format du Changelog

Ce changelog suit le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

### Types de Changements

- **Ajouté** : pour les nouvelles fonctionnalités
- **Modifié** : pour les changements dans les fonctionnalités existantes
- **Déprécié** : pour les fonctionnalités qui seront bientôt supprimées
- **Supprimé** : pour les fonctionnalités supprimées
- **Corrigé** : pour les corrections de bugs
- **Sécurité** : en cas de vulnérabilités

---

## 🤝 Contribution

Pour contribuer au changelog :

1. Ajoutez vos modifications dans la section `[Unreleased]`
2. Lors d'une release, déplacez les modifications vers une nouvelle version
3. Suivez le format établi
4. Soyez descriptif mais concis
5. Utilisez des emojis pour la lisibilité

---

**Dernière mise à jour** : Mars 2026
