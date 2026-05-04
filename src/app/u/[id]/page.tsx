'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ClientFormattedNumber } from '@/components/client-formatted-number'
import { useFirestore } from '@/firebase/provider'
import { useDoc, useUser } from '@/firebase'
import { collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, runTransaction, setDoc, serverTimestamp, where } from 'firebase/firestore'
import { Eye, Lock, Pause, Play, UserCheck, Volume2, VolumeX, UserPlus, Users, Heart, X } from 'lucide-react'
import type { User, Video } from '@/lib/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { createAppNotification } from '@/lib/notifications'
import { isAdminRole } from '@/lib/roles'
import { usernameFromName } from '@/lib/usernames'

export default function PublicProfilePage() {
  const params = useParams()
  const firestore = useFirestore()
  const { user: authUser } = useUser()
  const userId = Array.isArray(params.id) ? params.id[0] : params.id
  const normalizedId = typeof userId === 'string'
    ? decodeURIComponent(userId).replace(/^@/, '').trim()
    : userId

  const [userData, setUserData] = useState<User | null>(null)
  const [userVideos, setUserVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [profileRefPath, setProfileRefPath] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [followersCount, setFollowersCount] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const authProfileRef = firestore && authUser ? doc(firestore, 'users', authUser.uid) : null
  const { data: authProfile } = useDoc<User>(authProfileRef as any)
  const isAdmin = isAdminRole(authProfile?.role)

  useEffect(() => {
    const fetchData = async () => {
      if (!firestore || !userId) return
      setLoading(true)

      try {
        let userDocRef = normalizedId ? doc(firestore, 'users', normalizedId) : null
        let userDoc = userDocRef ? await getDoc(userDocRef) : null

        if (!userDoc || !userDoc.exists()) {
          const candidates = [normalizedId, normalizedId ? `@${normalizedId}` : ''].filter(Boolean)
          let foundDoc: typeof userDoc | null = null
          for (const candidate of candidates) {
            const q = query(
              collection(firestore, 'users'),
              where('username', '==', candidate)
            )
            const snap = await getDocs(q)
            if (!snap.empty) {
              foundDoc = snap.docs[0]
              break
            }
          }
          if (foundDoc) {
            userDoc = foundDoc
            userDocRef = foundDoc.ref
          }
        }

        if (userDoc && userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() } as User)
          setProfileRefPath(userDoc.ref.path)
        } else {
          setUserData(null)
          setProfileRefPath(null)
        }

        if (userDocRef) {
          const videosQuery = query(
            collection(firestore, 'videos'),
            where('userRef', '==', userDocRef)
          )
          const videosSnapshot = await getDocs(videosQuery)
          const videos = videosSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as Video[]
          setUserVideos(videos)
        } else {
          setUserVideos([])
        }
      } catch (error) {
        console.error('Error loading public profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [firestore, normalizedId])

  useEffect(() => {
    if (!firestore || !profileRefPath) return
    const unsubscribe = onSnapshot(doc(firestore, profileRefPath), (snapshot) => {
      if (snapshot.exists()) {
        setUserData({ id: snapshot.id, ...snapshot.data() } as User)
      }
    })
    return () => unsubscribe()
  }, [firestore, profileRefPath])

  useEffect(() => {
    if (!firestore || !profileRefPath) {
      setFollowersCount(null)
      setFollowingCount(null)
      return
    }

    const profileRef = doc(firestore, profileRefPath)
    const unsubscribeFollowers = onSnapshot(
      collection(profileRef, 'followers'),
      (snapshot) => setFollowersCount(snapshot.size),
      () => setFollowersCount(null)
    )
    const unsubscribeFollowing = onSnapshot(
      collection(profileRef, 'following'),
      (snapshot) => setFollowingCount(snapshot.size),
      () => setFollowingCount(null)
    )

    return () => {
      unsubscribeFollowers()
      unsubscribeFollowing()
    }
  }, [firestore, profileRefPath])

  useEffect(() => {
    if (!firestore || !authUser || !userData || authUser.uid === userData.id) {
      setIsFollowing(false)
      return
    }
    const followRef = doc(firestore, 'users', authUser.uid, 'following', userData.id)
    const unsubscribe = onSnapshot(followRef, (snapshot) => setIsFollowing(snapshot.exists()))
    return () => unsubscribe()
  }, [authUser, firestore, userData])

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center text-muted-foreground">
        Profil introuvable.
      </div>
    )
  }

  const totalVideoLikes = userVideos.reduce((total, video) => total + Number(video.likes || 0), 0)

  const stats = [
    { label: 'Abonnements', value: followingCount ?? Number(userData.following || 0), icon: UserPlus },
    { label: 'Abonnés', value: followersCount ?? Number(userData.followers || 0), icon: Users },
    { label: 'J\'aime', value: totalVideoLikes, icon: Heart },
  ]

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '0:00'
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleOpenVideo = (video: Video) => {
    if (!isAdmin && video.isPaid && (video.price ?? 0) > 0) {
      return
    }
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

  const handleFollow = async () => {
    if (!firestore || !userData || followBusy) return
    if (!authUser) {
      window.location.href = '/login'
      return
    }
    if (authUser.uid === userData.id) return

    setFollowBusy(true)
    const followerRef = doc(firestore, 'users', authUser.uid)
    const targetRef = doc(firestore, 'users', userData.id)
    const followingRef = doc(firestore, 'users', authUser.uid, 'following', userData.id)
    const followerDocRef = doc(firestore, 'users', userData.id, 'followers', authUser.uid)

    try {
      const nextFollowing = !isFollowing
      await runTransaction(firestore, async (transaction) => {
        const existing = await transaction.get(followingRef)
        if (nextFollowing && !existing.exists()) {
          transaction.set(followingRef, { userId: userData.id, createdAt: serverTimestamp() })
          transaction.set(followerDocRef, { userId: authUser.uid, createdAt: serverTimestamp() })
          transaction.update(followerRef, { following: increment(1) })
          transaction.update(targetRef, { followers: increment(1) })
        }
        if (!nextFollowing && existing.exists()) {
          transaction.delete(followingRef)
          transaction.delete(followerDocRef)
          transaction.update(followerRef, { following: increment(-1) })
          transaction.update(targetRef, { followers: increment(-1) })
        }
      })

      if (nextFollowing) {
        const actorSnap = await getDoc(followerRef)
        const actorData = actorSnap.exists() ? ({ id: actorSnap.id, ...actorSnap.data() } as User) : null
        const fallbackActorName = authUser.displayName || 'Utilisateur'
        await createAppNotification(firestore, {
          recipientId: userData.id,
          actorId: authUser.uid,
          actor: actorData
            ? { name: actorData.name, username: actorData.username, avatarUrl: actorData.avatarUrl }
            : { name: fallbackActorName, username: usernameFromName(fallbackActorName, authUser.uid), avatarUrl: authUser.photoURL || '' },
          type: 'follow',
          content: `${actorData?.name || fallbackActorName} vous suit maintenant.`,
        })
      }
    } finally {
      setFollowBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center pt-8">
      <div className="w-full max-w-4xl space-y-8 px-4">
        <div className="flex flex-col items-center gap-4">
          <button type="button" onClick={() => setAvatarOpen(true)} className="rounded-full">
            <Avatar className="h-32 w-32 border-4 border-primary">
              <AvatarImage src={userData.avatarUrl} alt={userData.name} />
              <AvatarFallback className="text-4xl">{userData.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold font-headline">{userData.name}</h1>
            <p className="text-muted-foreground">{userData.username}</p>
          </div>
          <p className="max-w-md text-center text-foreground/80">{userData.bio}</p>
          {authUser?.uid !== userData.id && (
            <Button variant={isFollowing ? 'outline' : 'secondary'} onClick={handleFollow} disabled={followBusy}>
              {isFollowing ? (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Abonné
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Suivre
                </>
              )}
            </Button>
          )}
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

        <div>
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold font-headline">Vidéos</h2>
            <p className="text-sm text-muted-foreground">
              Total J'aime: <ClientFormattedNumber value={totalVideoLikes} />
            </p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
            {userVideos.map((video) => {
              const isPaid = !isAdmin && Boolean((video.isPaid ?? false) || Number(video.price || 0) > 0)
              return (
                <Card
                  key={video.id}
                  className="overflow-hidden aspect-[3/4] border-0 rounded-none cursor-pointer relative"
                  onClick={() => handleOpenVideo(video)}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.description}
                      fill
                      className={`object-cover ${isPaid ? 'blur-md scale-105' : ''}`}
                      data-ai-hint="user video"
                    />
                    {isPaid && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                        <div className="flex flex-col items-center gap-1 text-xs">
                          <Lock className="h-5 w-5 text-primary" />
                          <span>{video.price} {video.currency ?? 'USD'}</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] text-white">
                      <Eye className="h-3 w-3" />
                      <ClientFormattedNumber value={video.views || 0} />
                    </div>
                  </div>
                </Card>
              )
            })}
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
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="border-0 bg-black/95 p-0 shadow-none sm:max-w-2xl">
          <div className="flex min-h-[70dvh] items-center justify-center p-6">
            <img src={userData.avatarUrl} alt={userData.name} className="max-h-[80dvh] max-w-full rounded-2xl object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
