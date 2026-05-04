'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { Bookmark, FolderLock, Lock, Play, ShoppingBag, Sparkles } from 'lucide-react'
import { useFirestore, useUser } from '@/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import type { Video } from '@/lib/types'

type SavedVideo = Pick<Video, 'id' | 'description' | 'thumbnailUrl' | 'price' | 'currency' | 'isPaid'> & {
  creatorId?: string | null
  savedAt?: any
}

type PrivateCollection = {
  id: string
  name: string
  videoIds?: string[]
  updatedAt?: any
}

function videoFromSnapshot(id: string, data: any): SavedVideo {
  return {
    id,
    description: data.description || 'Contenu vidéo',
    thumbnailUrl: data.thumbnailUrl || '',
    price: Number(data.price || 0),
    currency: data.currency || 'USD',
    isPaid: Boolean(data.isPaid || Number(data.price || 0) > 0),
    creatorId: data.creatorId || data.userId || data.userRef?.id || null,
    savedAt: data.createdAt || data.savedAt,
  }
}

function SavedVideoCard({
  video,
  collections,
  onAddToCollection,
}: {
  video: SavedVideo
  collections: PrivateCollection[]
  onAddToCollection: (collectionId: string, video: SavedVideo) => void
}) {
  const [selectedCollection, setSelectedCollection] = useState('')

  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.03]">
      <Link href={`/?video=${video.id}`} className="block">
        <div className="relative aspect-[3/4] bg-black">
          {video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt={video.description || 'Vidéo'} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Play className="h-8 w-8 text-white/60" />
            </div>
          )}
          {video.isPaid && (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">
              <Lock className="h-3 w-3 text-primary" />
              {video.price || 0} {video.currency || 'USD'}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
            <p className="line-clamp-2 text-xs font-medium text-white">{video.description || 'Contenu vidéo'}</p>
          </div>
        </div>
      </Link>

      {collections.length > 0 && (
        <div className="flex gap-2 p-2">
          <select
            value={selectedCollection}
            onChange={(event) => setSelectedCollection(event.target.value)}
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-background px-2 text-xs"
          >
            <option value="">Collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>{collection.name}</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={!selectedCollection}
            onClick={() => {
              onAddToCollection(selectedCollection, video)
              setSelectedCollection('')
            }}
          >
            Ajouter
          </Button>
        </div>
      )}
    </Card>
  )
}

export default function LibraryPage() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [favorites, setFavorites] = useState<SavedVideo[]>([])
  const [unlocked, setUnlocked] = useState<SavedVideo[]>([])
  const [collections, setCollections] = useState<PrivateCollection[]>([])
  const [collectionName, setCollectionName] = useState('')
  const [loading, setLoading] = useState(true)

  const favoritesRef = useMemo(() => {
    if (!firestore || !user) return null
    return collection(firestore, 'users', user.uid, 'favorites')
  }, [firestore, user])

  useEffect(() => {
    if (!favoritesRef) {
      setFavorites([])
      return
    }
    const unsubscribe = onSnapshot(
      query(favoritesRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        setFavorites(snapshot.docs.map((item) => videoFromSnapshot(item.id, item.data())))
      },
      () => setFavorites([])
    )
    return () => unsubscribe()
  }, [favoritesRef])

  useEffect(() => {
    if (!firestore || !user) {
      setUnlocked([])
      setLoading(false)
      return
    }

    let cancelled = false
    const loadUnlocked = async () => {
      setLoading(true)
      try {
        const purchasesSnapshot = await getDocs(
          query(collection(firestore, 'purchases'), where('userId', '==', user.uid), where('status', '==', 'completed'))
        )
        const videos = await Promise.all(
          purchasesSnapshot.docs.map(async (purchaseDoc) => {
            const purchase = purchaseDoc.data()
            if (!purchase.videoId) return null
            const videoSnap = await getDoc(doc(firestore, 'videos', purchase.videoId)).catch(() => null)
            if (!videoSnap?.exists()) return null
            return videoFromSnapshot(videoSnap.id, {
              ...videoSnap.data(),
              savedAt: purchase.createdAt,
            })
          })
        )
        if (!cancelled) setUnlocked(videos.filter(Boolean) as SavedVideo[])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUnlocked()
    return () => {
      cancelled = true
    }
  }, [firestore, user])

  useEffect(() => {
    if (!firestore || !user) {
      setCollections([])
      return
    }

    const unsubscribe = onSnapshot(
      query(collection(firestore, 'users', user.uid, 'collections'), orderBy('updatedAt', 'desc')),
      (snapshot) => {
        setCollections(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as PrivateCollection))
      },
      () => setCollections([])
    )

    return () => unsubscribe()
  }, [firestore, user])

  const createCollection = async () => {
    const name = collectionName.trim()
    if (!firestore || !user || !name) return
    const collectionRef = doc(collection(firestore, 'users', user.uid, 'collections'))
    await setDoc(collectionRef, {
      name,
      videoIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    setCollectionName('')
    toast({ title: 'Collection créée' })
  }

  const addToCollection = async (collectionId: string, video: SavedVideo) => {
    if (!firestore || !user) return
    await updateDoc(doc(firestore, 'users', user.uid, 'collections', collectionId), {
      videoIds: arrayUnion(video.id),
      updatedAt: serverTimestamp(),
    })
    toast({ title: 'Ajouté à la collection' })
  }

  if (!user) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center p-6 text-center">
        <div>
          <Bookmark className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-xl font-semibold">Bibliothèque privée</h1>
          <p className="mt-2 text-sm text-muted-foreground">Connectez-vous pour retrouver vos favoris et contenus débloqués.</p>
          <Button asChild className="mt-4">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh space-y-5 px-4 pb-28 pt-5">
      <header>
        <h1 className="text-2xl font-bold font-headline">Bibliothèque</h1>
        <p className="mt-1 text-sm text-muted-foreground">Favoris, collections privées et contenus payants déjà débloqués.</p>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>Cette page est privée. Elle sert aussi de base à des recommandations plus claires: favoris, achats et collections.</span>
      </div>

      <Tabs defaultValue="favorites" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="favorites">Favoris</TabsTrigger>
          <TabsTrigger value="unlocked">Débloqués</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="space-y-3">
          {favorites.length === 0 ? (
            <EmptyState icon={Bookmark} title="Aucun favori" text="Appuyez sur l’icône favori dans le fil vidéo pour enregistrer un contenu." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {favorites.map((video) => (
                <SavedVideoCard key={video.id} video={video} collections={collections} onAddToCollection={addToCollection} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unlocked" className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : unlocked.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Aucun contenu débloqué" text="Les contenus achetés avec le wallet apparaîtront ici." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {unlocked.map((video) => (
                <SavedVideoCard key={video.id} video={video} collections={collections} onAddToCollection={addToCollection} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Nom de collection privée"
              className="h-11"
            />
            <Button onClick={createCollection} disabled={!collectionName.trim()}>Créer</Button>
          </div>

          {collections.length === 0 ? (
            <EmptyState icon={FolderLock} title="Aucune collection" text="Créez une collection puis ajoutez-y vos favoris ou contenus débloqués." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {collections.map((collection) => (
                <Card key={collection.id} className="border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FolderLock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{collection.name}</p>
                      <p className="text-sm text-muted-foreground">{collection.videoIds?.length || 0} contenu(s)</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-primary" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
