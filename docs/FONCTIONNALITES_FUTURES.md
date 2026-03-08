# 🚀 Fonctionnalités Futures - NeyshaPlay

Ce document centralise toutes les fonctionnalités à ajouter ou modifier dans l'application NeyshaPlay.

---

## 📋 Template pour Nouvelles Fonctionnalités

Utilisez ce template pour documenter chaque nouvelle fonctionnalité :

```markdown
### [Nom de la Fonctionnalité]

**Statut**: 🔴 Non commencé | 🟡 En cours | 🟢 Terminé

**Priorité**: Haute | Moyenne | Basse

**Description**: 
[Description détaillée de la fonctionnalité]

**Fichiers concernés**:
- `chemin/vers/fichier1.tsx`
- `chemin/vers/fichier2.ts`

**Dépendances**:
- [Packages npm nécessaires]
- [Autres fonctionnalités requises]

**Étapes d'implémentation**:
1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

**Tests à effectuer**:
- [ ] Test 1
- [ ] Test 2

**Notes**:
[Notes supplémentaires, considérations techniques, etc.]
```

---

## 🎯 Fonctionnalités Planifiées

### Phase 1: Interactions Sociales

#### 1.1 Système de Likes en Temps Réel

**Statut**: 🔴 Non commencé

**Priorité**: Haute

**Description**: 
Permettre aux utilisateurs de liker les vidéos avec mise à jour en temps réel du compteur.

**Fichiers concernés**:
- `src/components/video-card.tsx`
- `src/lib/types.ts`
- `firestore.rules`

**Dépendances**:
- Firebase Firestore (déjà installé)
- Authentification utilisateur

**Étapes d'implémentation**:
1. Créer une collection `likes` dans Firestore
2. Ajouter un hook `useLike` pour gérer l'état
3. Implémenter l'animation du bouton like
4. Mettre à jour le compteur en temps réel
5. Gérer les likes/unlikes

**Tests à effectuer**:
- [ ] Like/unlike fonctionne correctement
- [ ] Le compteur se met à jour en temps réel
- [ ] L'animation est fluide
- [ ] Pas de double-like possible

---

#### 1.2 Système de Commentaires

**Statut**: 🔴 Non commencé

**Priorité**: Haute

**Description**: 
Permettre aux utilisateurs de commenter les vidéos avec un système de réponses.

**Fichiers concernés**:
- `src/components/video-card.tsx`
- `src/components/comments-modal.tsx` (à créer)
- `src/lib/types.ts`

**Dépendances**:
- Firebase Firestore
- `@radix-ui/react-dialog` (déjà installé)

**Étapes d'implémentation**:
1. Créer une collection `comments` dans Firestore
2. Créer le composant `CommentsModal`
3. Implémenter l'ajout de commentaires
4. Ajouter le système de réponses
5. Gérer la suppression (pour l'auteur)

**Tests à effectuer**:
- [ ] Ajout de commentaire fonctionne
- [ ] Réponses aux commentaires
- [ ] Suppression de ses propres commentaires
- [ ] Affichage en temps réel

---

#### 1.3 Système de Partage

**Statut**: 🔴 Non commencé

**Priorité**: Moyenne

**Description**: 
Permettre le partage de vidéos via lien, réseaux sociaux, ou copie du lien.

**Fichiers concernés**:
- `src/components/video-card.tsx`
- `src/components/share-modal.tsx` (à créer)

**Dépendances**:
- Web Share API (natif)
- `react-share` (à installer si nécessaire)

**Étapes d'implémentation**:
1. Créer le composant `ShareModal`
2. Implémenter Web Share API
3. Ajouter options de partage (Twitter, Facebook, WhatsApp)
4. Copie du lien dans le presse-papier
5. Incrémenter le compteur de partages

**Tests à effectuer**:
- [ ] Partage natif fonctionne sur mobile
- [ ] Copie du lien fonctionne
- [ ] Compteur de partages s'incrémente

---

#### 1.4 Système Follow/Unfollow

**Statut**: 🔴 Non commencé

**Priorité**: Haute

**Description**: 
Permettre de suivre/ne plus suivre des créateurs avec mise à jour des compteurs.

**Fichiers concernés**:
- `src/components/video-card.tsx`
- `src/app/profile/page.tsx`
- `src/lib/types.ts`

**Dépendances**:
- Firebase Firestore

**Étapes d'implémentation**:
1. Créer une collection `follows` dans Firestore
2. Ajouter un hook `useFollow`
3. Implémenter le bouton follow/unfollow
4. Mettre à jour les compteurs (followers/following)
5. Créer une page "Abonnements"

**Tests à effectuer**:
- [ ] Follow/unfollow fonctionne
- [ ] Compteurs se mettent à jour
- [ ] Impossible de se suivre soi-même
- [ ] Liste des abonnements accessible

---

#### 1.5 Notifications Push

**Statut**: 🔴 Non commencé

**Priorité**: Moyenne

**Description**: 
Envoyer des notifications pour les likes, commentaires, nouveaux followers.

**Fichiers concernés**:
- `src/app/inbox/page.tsx`
- `src/firebase/notifications.ts` (à créer)
- `public/firebase-messaging-sw.js` (à créer)

**Dépendances**:
- Firebase Cloud Messaging
- Service Worker

**Étapes d'implémentation**:
1. Configurer Firebase Cloud Messaging
2. Créer le service worker
3. Demander la permission de notifications
4. Implémenter l'envoi de notifications
5. Gérer la réception et l'affichage

**Tests à effectuer**:
- [ ] Permission demandée correctement
- [ ] Notifications reçues en arrière-plan
- [ ] Notifications reçues au premier plan
- [ ] Clic sur notification redirige correctement

---

### Phase 2: Amélioration Création

#### 2.1 Bibliothèque de Sons

**Statut**: 🔴 Non commencé

**Priorité**: Haute

**Description**: 
Ajouter une bibliothèque de sons/musiques pour les vidéos.

**Fichiers concernés**:
- `src/app/create/page.tsx`
- `src/components/sound-library.tsx` (à créer)
- `src/lib/types.ts`

**Dépendances**:
- Firebase Storage (pour stocker les sons)
- Ou API externe (Spotify, SoundCloud)

**Étapes d'implémentation**:
1. Créer une collection `sounds` dans Firestore
2. Créer le composant `SoundLibrary`
3. Implémenter la recherche de sons
4. Prévisualisation audio
5. Sélection et ajout à la vidéo

**Tests à effectuer**:
- [ ] Recherche de sons fonctionne
- [ ] Prévisualisation audio
- [ ] Son ajouté correctement à la vidéo
- [ ] Synchronisation audio/vidéo

---

#### 2.2 Effets Visuels Avancés

**Statut**: 🔴 Non commencé

**Priorité**: Moyenne

**Description**: 
Ajouter des effets visuels (transitions, stickers, texte animé).

**Fichiers concernés**:
- `src/app/create/page.tsx`
- `src/components/effects-panel.tsx` (à créer)

**Dépendances**:
- `fabric.js` ou `konva` (pour le canvas)
- `framer-motion` (pour les animations)

**Étapes d'implémentation**:
1. Installer les dépendances
2. Créer le composant `EffectsPanel`
3. Implémenter l'ajout de texte
4. Ajouter des stickers
5. Créer des transitions

**Tests à effectuer**:
- [ ] Ajout de texte fonctionne
- [ ] Stickers positionnables
- [ ] Transitions fluides
- [ ] Export avec effets

---

#### 2.3 Montage Multi-Clips

**Statut**: 🔴 Non commencé

**Priorité**: Basse

**Description**: 
Permettre d'enregistrer plusieurs clips et les assembler.

**Fichiers concernés**:
- `src/app/create/page.tsx`
- `src/components/timeline.tsx` (à créer)

**Dépendances**:
- `ffmpeg.wasm` (pour le montage côté client)

**Étapes d'implémentation**:
1. Installer ffmpeg.wasm
2. Créer le composant Timeline
3. Gérer l'enregistrement de plusieurs clips
4. Implémenter l'assemblage
5. Prévisualisation du résultat

**Tests à effectuer**:
- [ ] Enregistrement de plusieurs clips
- [ ] Réorganisation des clips
- [ ] Assemblage correct
- [ ] Export final

---

### Phase 3: Découverte & Engagement

#### 3.1 Algorithme de Recommandation

**Statut**: 🔴 Non commencé

**Priorité**: Haute

**Description**: 
Implémenter un algorithme pour recommander des vidéos personnalisées.

**Fichiers concernés**:
- `src/app/page.tsx`
- `src/lib/recommendations.ts` (à créer)
- Backend Genkit AI

**Dépendances**:
- Google Genkit (déjà installé)
- Firebase ML (optionnel)

**Étapes d'implémentation**:
1. Collecter les données d'interaction (vues, likes, temps de visionnage)
2. Créer un modèle de recommandation avec Genkit
3. Implémenter l'API de recommandation
4. Intégrer dans le feed principal
5. A/B testing

**Tests à effectuer**:
- [ ] Recommandations pertinentes
- [ ] Performance acceptable
- [ ] Diversité du contenu
- [ ] Mise à jour en temps réel

---

#### 3.2 Recherche Avancée

**Statut**: 🔴 Non commencé

**Priorité**: Moyenne

**Description**: 
Améliorer la recherche avec filtres, suggestions, recherche vocale.

**Fichiers concernés**:
- `src/app/discover/page.tsx`
- `src/components/advanced-search.tsx` (à créer)

**Dépendances**:
- Algolia ou Elasticsearch (pour la recherche)
- Web Speech API (pour la recherche vocale)

**Étapes d'implémentation**:
1. Intégrer Algolia/Elasticsearch
2. Indexer les vidéos
3. Créer l'interface de recherche avancée
4. Ajouter des filtres (date, popularité, durée)
5. Implémenter la recherche vocale

**Tests à effectuer**:
- [ ] Recherche rapide et pertinente
- [ ] Filtres fonctionnent
- [ ] Suggestions automatiques
- [ ] Recherche vocale précise

---

#### 3.3 Challenges et Tendances

**Statut**: 🔴 Non commencé

**Priorité**: Moyenne

**Description**: 
Créer un système de challenges et mettre en avant les tendances.

**Fichiers concernés**:
- `src/app/discover/page.tsx`
- `src/components/challenges.tsx` (à créer)
- `src/lib/types.ts`

**Dépendances**:
- Firebase Firestore

**Étapes d'implémentation**:
1. Créer une collection `challenges` dans Firestore
2. Créer le composant `Challenges`
3. Implémenter la participation aux challenges
4. Afficher les vidéos du challenge
5. Système de classement

**Tests à effectuer**:
- [ ] Création de challenge
- [ ] Participation fonctionne
- [ ] Classement correct
- [ ] Affichage des tendances

---

### Phase 4: Messagerie

#### 4.1 Chat en Temps Réel

**Statut**: 🔴 Non commencé

**Priorité**: Moyenne

**Description**: 
Implémenter une messagerie directe entre utilisateurs.

**Fichiers concernés**:
- `src/app/inbox/page.tsx`
- `src/components/chat.tsx` (à créer)
- `src/lib/types.ts`

**Dépendances**:
- Firebase Firestore (pour les messages)
- Firebase Cloud Functions (pour les notifications)

**Étapes d'implémentation**:
1. Créer une collection `conversations` et `messages`
2. Créer le composant `Chat`
3. Implémenter l'envoi de messages
4. Affichage en temps réel
5. Indicateurs de lecture

**Tests à effectuer**:
- [ ] Envoi de messages instantané
- [ ] Réception en temps réel
- [ ] Indicateurs de lecture
- [ ] Historique des conversations

---

#### 4.2 Envoi de Médias

**Statut**: 🔴 Non commencé

**Priorité**: Basse

**Description**: 
Permettre l'envoi d'images, vidéos, GIFs dans les messages.

**Fichiers concernés**:
- `src/components/chat.tsx`
- `src/components/media-picker.tsx` (à créer)

**Dépendances**:
- Firebase Storage

**Étapes d'implémentation**:
1. Créer le composant `MediaPicker`
2. Implémenter l'upload de médias
3. Prévisualisation avant envoi
4. Compression des images
5. Affichage dans le chat

**Tests à effectuer**:
- [ ] Upload de médias fonctionne
- [ ] Compression efficace
- [ ] Prévisualisation correcte
- [ ] Affichage dans le chat

---

### Phase 5: Monétisation

#### 5.1 Programme Créateur

**Statut**: 🔴 Non commencé

**Priorité**: Basse

**Description**: 
Créer un programme pour les créateurs avec analytics et revenus.

**Fichiers concernés**:
- `src/app/creator/page.tsx` (à créer)
- `src/components/analytics-dashboard.tsx` (à créer)

**Dépendances**:
- Firebase Analytics
- Stripe (pour les paiements)

**Étapes d'implémentation**:
1. Créer le tableau de bord créateur
2. Implémenter les analytics (vues, engagement)
3. Intégrer Stripe pour les paiements
4. Système de seuil de paiement
5. Historique des revenus

**Tests à effectuer**:
- [ ] Analytics précises
- [ ] Paiements fonctionnent
- [ ] Seuils respectés
- [ ] Historique accessible

---

#### 5.2 Système de Dons

**Statut**: 🔴 Non commencé

**Priorité**: Basse

**Description**: 
Permettre aux utilisateurs de faire des dons aux créateurs.

**Fichiers concernés**:
- `src/components/video-card.tsx`
- `src/components/donation-modal.tsx` (à créer)

**Dépendances**:
- Stripe ou PayPal

**Étapes d'implémentation**:
1. Intégrer Stripe/PayPal
2. Créer le composant `DonationModal`
3. Implémenter le processus de paiement
4. Notifications de dons
5. Historique des dons

**Tests à effectuer**:
- [ ] Paiement sécurisé
- [ ] Notifications envoyées
- [ ] Historique correct
- [ ] Remboursements possibles

---

## 📊 Suivi Global

### Statistiques

- **Total de fonctionnalités**: 15
- **Non commencées**: 15 🔴
- **En cours**: 0 🟡
- **Terminées**: 0 🟢

### Améliorations Récentes (v0.2.0)

#### ✅ Authentification Simplifiée
- **Statut**: 🟢 Terminé
- Authentification Google uniquement
- Sélection du rôle (Utilisateur/Créateur) à la première connexion
- Création de profil optimiste

#### ✅ Migration Cloudinary
- **Statut**: 🟢 Terminé
- Remplacement de Firebase Storage par Cloudinary
- Upload avec progression
- Génération automatique de miniatures
- CDN global

#### ✅ Optimistic UI
- **Statut**: 🟢 Terminé
- Likes instantanés
- Publication sans attente
- Upload en arrière-plan
- Gestion des erreurs avec rollback

### Priorités

- **Haute**: 6 fonctionnalités
- **Moyenne**: 7 fonctionnalités
- **Basse**: 2 fonctionnalités

---

## 📝 Notes Générales

### Considérations Techniques

1. **Performance**: Optimiser les requêtes Firestore avec des index
2. **Sécurité**: Mettre à jour les règles Firestore pour chaque nouvelle fonctionnalité
3. **Tests**: Ajouter des tests unitaires et e2e progressivement
4. **CI/CD**: Mettre en place un pipeline de déploiement automatique
5. **Monitoring**: Intégrer Firebase Analytics et Crashlytics

### Dépendances à Installer

```bash
# Pour les fonctionnalités futures
npm install react-share fabric konva framer-motion @stripe/stripe-js
npm install -D @testing-library/react @testing-library/jest-dom vitest
```

### Règles de Contribution

1. Créer une branche pour chaque fonctionnalité
2. Mettre à jour ce document avec le statut
3. Ajouter des tests pour chaque nouvelle fonctionnalité
4. Documenter les changements dans le code
5. Faire une revue de code avant merge

---

**Dernière mise à jour**: Mars 2026
