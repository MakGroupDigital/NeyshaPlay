'use client'

import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ClientFormattedNumber } from '@/components/client-formatted-number'
import { useUser } from '@/firebase'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useFirestore } from '@/firebase/provider'
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore'
import type { User, Video } from '@/lib/types'
import { Settings, UserPlus, Users, Heart, X, Play, Pause, Volume2, VolumeX, Share2, Copy, QrCode, MoreVertical, Trash2, Edit } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const firestore = useFirestore()
  const { toast } = useToast()

  const [userData, setUserData] = useState<User | null>(null)
  const [userVideos, setUserVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [profileUrl, setProfileUrl] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editSong, setEditSong] = useState('')
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<Video | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login')
    }
  }, [user, userLoading, router])
  
  useEffect(() => {
    const fetchData = async () => {
      if (user && firestore) {
        setLoading(true)
        // Fetch user data
        const userDocRef = doc(firestore, 'users', user.uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() } as User)
        }

        // Fetch user videos
        const videosQuery = query(
          collection(firestore, 'videos'),
          where('userRef', '==', userDocRef)
        )
        const videosSnapshot = await getDocs(videosQuery)
        const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video))
        setUserVideos(videos)
        setLoading(false)
      }
    }
    fetchData()
  }, [user, firestore])

  useEffect(() => {
    if (!userData) return
    if (typeof window === 'undefined') return
    const usernameSlug = userData.username?.replace(/^@/, '').trim()
    const slug = encodeURIComponent(usernameSlug || userData.id)
    const url = `${window.location.origin}/u/${slug}`
    setProfileUrl(url)
  }, [userData])

  useEffect(() => {
    if (!profileUrl) return
    const encoded = encodeURIComponent(profileUrl)
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}`)
  }, [profileUrl])


  if (userLoading || loading || !user || !userData) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '0:00'
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleShareProfile = async () => {
    if (!profileUrl) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Profil de ${userData.name}`,
          text: `Découvrez le profil de ${userData.name} sur NeyshaPlay`,
          url: profileUrl,
        })
      } else {
        await navigator.clipboard.writeText(profileUrl)
        toast({ title: 'Lien copié' })
      }
    } catch (error) {
      console.warn('Share cancelled or failed:', error)
    }
  }

  const handleCopyProfile = async () => {
    if (!profileUrl) return
    try {
      await navigator.clipboard.writeText(profileUrl)
      toast({ title: 'Lien copié' })
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleOpenVideo = (video: Video) => {
    setSelectedVideo(video)
    setIsPlaying(true)
    setProgress(0)
  }

  const handleCloseVideo = () => {
    setSelectedVideo(null)
    setIsPlaying(false)
    setProgress(0)
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  const handleDeleteVideo = async () => {
    if (!deleteConfirmVideo || !firestore) return
    
    setIsDeleting(true)
    try {
      await deleteDoc(doc(firestore, 'videos', deleteConfirmVideo.id))
      setUserVideos((prev) => prev.filter((v) => v.id !== deleteConfirmVideo.id))
      toast({ title: 'Vidéo supprimée' })
      setDeleteConfirmVideo(null)
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la vidéo',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video)
    setEditDescription(video.description)
    setEditSong(video.song || '')
  }

  const handleSaveEdit = async () => {
    if (!editingVideo || !firestore) return
    
    setIsSaving(true)
    try {
      await updateDoc(doc(firestore, 'videos', editingVideo.id), {
        description: editDescription,
        song: editSong,
      })
      setUserVideos((prev) =>
        prev.map((v) =>
          v.id === editingVideo.id
            ? { ...v, description: editDescription, song: editSong }
            : v
        )
      )
      toast({ title: 'Vidéo mise à jour' })
      setEditingVideo(null)
    } catch (error) {
      console.error('Update error:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la vidéo',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTogglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    setProgress(videoRef.current.currentTime)
    setDuration(videoRef.current.duration || 0)
  }

  const handleSeek = (value: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = value
    setProgress(value)
  }

  const handleToggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setIsMuted(videoRef.current.muted)
  }

  const stats = [
    { label: 'Abonnements', value: userData.following, icon: UserPlus },
    { label: 'Abonnés', value: userData.followers, icon: Users },
    { label: 'J\'aime', value: userData.likes, icon: Heart },
  ]

  return (
    <div className="flex flex-col items-center pt-8">
      <div className="w-full max-w-4xl space-y-8 px-4">
        <div className="flex flex-col items-center gap-4 relative">
          <button
            type="button"
            aria-label="Paramètres"
            className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-5 w-5" />
          </button>
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage src={userData.avatarUrl} alt={userData.name} />
            <AvatarFallback className="text-4xl">{userData.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-3xl font-bold font-headline">{userData.name}</h1>
            <p className="text-muted-foreground">{userData.username}</p>
          </div>
          <p className="max-w-md text-center text-foreground/80">{userData.bio}</p>
          <Button variant="secondary">Modifier le profil</Button>
        </div>

        <div className="flex justify-center gap-6 border-y py-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="text-center flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-2xl font-bold">
                    <ClientFormattedNumber value={stat.value} />
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {userData.role === 'creator' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold font-headline">Partager mon profil</h3>
                <p className="text-sm text-muted-foreground">
                  Lien personnalisé et QR code pour vos abonnés.
                </p>
              </div>
              <Button variant="secondary" className="gap-2" onClick={handleShareProfile} disabled={!profileUrl}>
                <Share2 className="h-4 w-4" />
                Partager
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <p className="text-xs text-muted-foreground">Lien personnalisé</p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                  <span className="text-xs font-medium text-white/90 truncate">
                    {profileUrl || '...'}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-8 w-8 text-white/80 hover:text-white"
                    onClick={handleCopyProfile}
                    disabled={!profileUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR code du profil"
                    className="h-24 w-24 rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-white/10 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-white/60" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">QR Code</p>
                  <p className="text-xs text-muted-foreground">Scannez pour ouvrir</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold font-headline mb-4 text-center">Vidéos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
            {userVideos.map((video) => (
              <Card
                key={video.id}
                className="overflow-hidden aspect-[3/4] border-0 rounded-none cursor-pointer relative group"
              >
                <div className="relative h-full w-full" onClick={() => handleOpenVideo(video)}>
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.description}
                    fill
                    className="object-cover"
                    data-ai-hint="user video"
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditVideo(video)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirmVideo(video)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
          {userVideos.length === 0 && (
            <div className="py-10 text-center text-muted-foreground">
              Aucune vidéo publiée pour le moment.
            </div>
          )}
        </div>
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              src={selectedVideo.videoUrl}
              className="h-full w-full object-contain"
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />
          </div>

          <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-[calc(1rem+env(safe-area-inset-right))] z-10 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-11 w-11 text-white hover:bg-white/10"
              onClick={handleToggleMute}
            >
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-11 w-11 text-white hover:bg-white/10"
              onClick={handleCloseVideo}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] px-4">
            <div className="rounded-2xl bg-black/60 px-4 py-3 text-white backdrop-blur">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-11 w-11 text-white hover:bg-white/10"
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={progress}
                    onChange={(event) => handleSeek(Number(event.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-foreground/80 line-clamp-2">
                {selectedVideo.description}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de modification */}
      <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la vidéo</DialogTitle>
            <DialogDescription>
              Modifiez la description et la musique de votre vidéo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description de la vidéo..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Musique</label>
              <Input
                value={editSong}
                onChange={(e) => setEditSong(e.target.value)}
                placeholder="Nom de la musique..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVideo(null)} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={!!deleteConfirmVideo} onOpenChange={(open) => !open && setDeleteConfirmVideo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la vidéo</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmVideo(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteVideo} disabled={isDeleting}>
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
