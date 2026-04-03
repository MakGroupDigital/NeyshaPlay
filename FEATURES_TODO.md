# Fonctionnalités à implémenter

## ✅ FAIT: Index Firestore déployés

Les index ont été déployés avec succès. Les top créateurs devraient maintenant s'afficher dans le header.

## 🔄 EN COURS: Fonctionnalités restantes

### 1. Gestion des vidéos par le créateur ✏️

**Objectif**: Permettre aux créateurs de supprimer ou modifier leurs vidéos

**Fichiers à modifier**:
- `src/app/profile/page.tsx` - Ajouter boutons supprimer/modifier sur chaque vidéo
- `src/components/video-actions-menu.tsx` - Nouveau composant pour le menu d'actions

**Implémentation**:
```typescript
// Dans profile/page.tsx, ajouter un menu contextuel sur chaque vidéo
<Card>
  <Image src={video.thumbnailUrl} />
  <div className="absolute top-2 right-2">
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleEdit(video)}>
          <Edit /> Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDelete(video)}>
          <Trash /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</Card>

// Fonctions de gestion
const handleDelete = async (video: Video) => {
  if (!confirm('Supprimer cette vidéo?')) return
  
  try {
    // Supprimer de Firestore
    await deleteDoc(doc(firestore, 'videos', video.id))
    
    // Supprimer de Cloudinary (optionnel)
    // await deleteFromCloudinary(video.cloudinaryPublicId)
    
    // Mettre à jour l'état local
    setUserVideos(prev => prev.filter(v => v.id !== video.id))
    
    toast({ title: 'Vidéo supprimée' })
  } catch (error) {
    toast({ title: 'Erreur', variant: 'destructive' })
  }
}

const handleEdit = async (video: Video) => {
  // Ouvrir un dialog pour modifier la description, prix, etc.
  setEditingVideo(video)
  setShowEditDialog(true)
}
```

### 2. Son global pour toutes les vidéos 🔊

**Objectif**: Le paramètre de son s'applique à toutes les vidéos qui défilent

**Fichiers modifiés**:
- ✅ `src/app/page.tsx` - Ajout du state `globalMuted`
- 🔄 `src/components/video-card.tsx` - Utiliser `globalMuted` au lieu de `isMuted` local

**Implémentation**:
```typescript
// Dans video-card.tsx
export function VideoCard({ 
  video, 
  globalMuted = true, 
  onMuteToggle 
}: VideoCardProps) {
  // Supprimer le state local isMuted
  // const [isMuted, setIsMuted] = useState(true) ❌
  
  // Utiliser globalMuted directement
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (locked) return
    if (onMuteToggle) {
      onMuteToggle(!globalMuted) // Toggle global
    }
  }
  
  // Dans le useEffect pour la vidéo
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = globalMuted
    }
  }, [globalMuted])
  
  // Dans le rendu
  <video
    ref={videoRef}
    muted={globalMuted} // Utiliser globalMuted
    ...
  />
  
  <Button onClick={toggleMute}>
    {globalMuted ? <VolumeX /> : <Volume2 />}
  </Button>
}
```

### 3. Barre de recherche fonctionnelle (page Discover) 🔍

**Objectif**: Rechercher des vidéos et utilisateurs

**Fichiers à modifier**:
- `src/app/discover/page.tsx` - Implémenter la recherche

**Implémentation**:
```typescript
// Dans discover/page.tsx
const [searchQuery, setSearchQuery] = useState('')
const [searchResults, setSearchResults] = useState<{
  videos: Video[]
  users: User[]
}>({ videos: [], users: [] })

const handleSearch = async (query: string) => {
  if (!query.trim()) {
    setSearchResults({ videos: [], users: [] })
    return
  }
  
  setSearching(true)
  
  try {
    // Recherche de vidéos par description
    const videosQuery = query(
      collection(firestore, 'videos'),
      where('description', '>=', query),
      where('description', '<=', query + '\uf8ff'),
      limit(20)
    )
    const videosSnapshot = await getDocs(videosQuery)
    const videos = videosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Video[]
    
    // Recherche d'utilisateurs par nom/username
    const usersQuery = query(
      collection(firestore, 'users'),
      where('name', '>=', query),
      where('name', '<=', query + '\uf8ff'),
      limit(10)
    )
    const usersSnapshot = await getDocs(usersQuery)
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as User[]
    
    setSearchResults({ videos, users })
  } catch (error) {
    console.error('Search error:', error)
  } finally {
    setSearching(false)
  }
}

// Dans le rendu
<div className="p-4">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    <Input
      type="search"
      placeholder="Rechercher des vidéos ou des créateurs..."
      className="pl-10"
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value)
        handleSearch(e.target.value)
      }}
    />
  </div>
  
  {searchQuery && (
    <div className="mt-4 space-y-6">
      {/* Résultats utilisateurs */}
      {searchResults.users.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Créateurs</h3>
          {searchResults.users.map(user => (
            <Link key={user.id} href={`/u/${user.id}`}>
              <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg">
                <Avatar>
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.username}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Résultats vidéos */}
      {searchResults.videos.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Vidéos</h3>
          <div className="grid grid-cols-3 gap-1">
            {searchResults.videos.map(video => (
              <VideoThumbnail key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}
      
      {/* Aucun résultat */}
      {searchResults.videos.length === 0 && searchResults.users.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucun résultat pour "{searchQuery}"
        </div>
      )}
    </div>
  )}
</div>
```

**Note**: Pour une meilleure recherche, considérez:
- Algolia Search (recherche full-text)
- Elasticsearch
- Firebase Extensions (Full Text Search)

## 📝 Index Firestore supplémentaires nécessaires

Pour la recherche, ajoutez ces index:

```json
{
  "collectionGroup": "videos",
  "fields": [
    { "fieldPath": "description", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "fields": [
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
}
```

## 🚀 Ordre d'implémentation recommandé

1. ✅ **Son global** (le plus simple, impact immédiat)
2. **Recherche** (fonctionnalité visible, améliore UX)
3. **Gestion vidéos** (important pour créateurs)

## 🔧 Commandes utiles

```bash
# Déployer les nouveaux index
npm run deploy:indexes

# Tester en local
npm run dev

# Build mobile après modifications
npm run build:mobile
```

## ⚠️ Points d'attention

1. **Suppression Cloudinary**: Implémenter la suppression côté serveur (Cloud Functions)
2. **Permissions**: Vérifier que seul le propriétaire peut supprimer/modifier
3. **Recherche**: Limiter les résultats pour éviter les coûts Firestore
4. **Son global**: Sauvegarder la préférence dans localStorage

## 📚 Ressources

- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/queries)
- [Cloudinary Delete API](https://cloudinary.com/documentation/admin_api#delete_resources)
- [React Context for Global State](https://react.dev/reference/react/useContext)
