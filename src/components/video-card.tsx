'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Video } from '@/lib/types'
import { Heart, MessageCircle, Send, Music, Volume2, VolumeX, Lock, Wallet, ShoppingBag, Bookmark, Images } from 'lucide-react'
import { ClientFormattedNumber } from './client-formatted-number'
import { useFirestore, useUser } from '@/firebase'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { createAppNotification } from '@/lib/notifications'
import { usernameFromName } from '@/lib/usernames'

type PendingStatus = 'pending' | 'failed' | 'completed' | undefined
type UnlockResult = { status: 'unlocked' } | { status: 'insufficient'; balance: number; amount: number }

type VideoCardProps = {
  video: Video
  isLocked?: boolean
  onPay?: (video: Video) => Promise<UnlockResult | void> | UnlockResult | void
  onFeedSignal?: (video: Video, event: 'view' | 'like') => void
  globalMuted?: boolean
  onMuteToggle?: (muted: boolean) => void
  pendingStatus?: PendingStatus
}

type VideoComment = {
  id: string
  text: string
  userId: string
  username: string
  avatarUrl?: string
  createdAt?: Date
}

export function VideoCard({ video, isLocked = false, onPay, onFeedSignal, globalMuted = true, onMuteToggle, pendingStatus }: VideoCardProps) {
  const firestore = useFirestore()
  const { user: authUser } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [likes, setLikes] = useState(video.likes)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPaySheet, setShowPaySheet] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentCount, setCommentCount] = useState(video.comments)
  const [comments, setComments] = useState<VideoComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [localUnlocked, setLocalUnlocked] = useState(false)
  const [showFundsPrompt, setShowFundsPrompt] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)
  const [likeBursts, setLikeBursts] = useState<Array<{ id: string; x: number; y: number }>>([])
  const [showDetails, setShowDetails] = useState(true)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)

  const cardRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewRecordedRef = useRef(false)
  const photoDragRef = useRef<{ startX: number; startY: number; pointerId?: number; dragging: boolean } | null>(null)
  const suppressNextCardClickRef = useRef(false)
  const mediaItems = (video.mediaItems && video.mediaItems.length > 0)
    ? video.mediaItems
    : video.imageUrls && video.imageUrls.length > 0
      ? video.imageUrls.map((url) => ({ type: 'image' as const, url, thumbnailUrl: url }))
      : [{ type: 'video' as const, url: video.videoUrl, thumbnailUrl: video.thumbnailUrl }]
  const isPhotoPost = video.mediaType === 'photos' || mediaItems.some((item) => item.type === 'image')
  const numericPrice = typeof video.price === 'number' ? video.price : Number(video.price || 0)
  const isPaidContent = Boolean((video.isPaid ?? false) || numericPrice > 0)
  const locked = isPaidContent && isLocked && !localUnlocked
  const showPending = locked && pendingStatus === 'pending'
  const showFailed = locked && pendingStatus === 'failed'
  const displayPrice = Number.isFinite(numericPrice) ? numericPrice : 0
  const displayCurrency = video.currency ?? 'USD'

  const goToPhoto = (nextIndex: number) => {
    setActiveMediaIndex(Math.max(0, Math.min(mediaItems.length - 1, nextIndex)))
  }

  const goToPreviousPhoto = () => goToPhoto(activeMediaIndex - 1)
  const goToNextPhoto = () => goToPhoto(activeMediaIndex + 1)

  const handlePhotoPointerDown = (event: any) => {
    if (!isPhotoPost || mediaItems.length < 2) return
    photoDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      dragging: true,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePhotoPointerUp = (event: any) => {
    const gesture = photoDragRef.current
    if (!gesture?.dragging) return
    photoDragRef.current = null
    event.currentTarget.releasePointerCapture?.(gesture.pointerId)
    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
    event.stopPropagation()
    event.preventDefault()
    suppressNextCardClickRef.current = true
    window.setTimeout(() => {
      suppressNextCardClickRef.current = false
    }, 0)
    if (deltaX < 0) {
      goToNextPhoto()
    } else {
      goToPreviousPhoto()
    }
  }

  const handlePhotoPointerCancel = () => {
    photoDragRef.current = null
  }

  useEffect(() => {
    setLikes(video.likes)
    setCommentCount(video.comments)
  }, [video.likes, video.comments])

  useEffect(() => {
    if (!firestore || !authUser) {
      setIsLiked(false)
      return
    }

    const likeRef = doc(firestore, 'videos', video.id, 'likes', authUser.uid)
    getDoc(likeRef)
      .then((snapshot) => setIsLiked(snapshot.exists()))
      .catch((error) => {
        console.warn('Unable to load like status:', error)
      })
  }, [firestore, authUser, video.id])

  useEffect(() => {
    if (!firestore || !authUser) {
      setIsFavorited(false)
      return
    }

    getDoc(doc(firestore, 'users', authUser.uid, 'favorites', video.id))
      .then((snapshot) => setIsFavorited(snapshot.exists()))
      .catch(() => undefined)
  }, [firestore, authUser, video.id])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const burstId = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    setLikeBursts((prev) => [
      ...prev,
      { id: burstId, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    ])
    setTimeout(() => {
      setLikeBursts((prev) => prev.filter((item) => item.id !== burstId))
    }, 900)

    if (!authUser) {
      router.push('/login')
      return
    }
    if (!firestore) return

    // Optimistic UI: Update immediately
    const newLikedState = !isLiked
    const newLikesCount = Math.max(0, newLikedState ? likes + 1 : likes - 1)
    
    setIsLiked(newLikedState)
    setLikes(newLikesCount)
    
    try {
      const likeRef = doc(firestore, 'videos', video.id, 'likes', authUser.uid)
      const videoRef = doc(firestore, 'videos', video.id)
      const creatorId = (video.userRef as any)?.id ?? video.user?.id
      if (newLikedState) {
        onFeedSignal?.(video, 'like')
        await setDoc(likeRef, {
          userId: authUser.uid,
          createdAt: serverTimestamp(),
        })
      } else {
        await deleteDoc(likeRef)
      }
      await updateDoc(videoRef, {
        likes: increment(newLikedState ? 1 : -1),
      })
      if (creatorId) {
        await updateDoc(doc(firestore, 'users', creatorId), {
          likes: increment(newLikedState ? 1 : -1),
        }).catch(() => undefined)
      }
      if (newLikedState && creatorId && creatorId !== authUser.uid) {
        const actorSnap = await getDoc(doc(firestore, 'users', authUser.uid)).catch(() => null)
        const fallbackActorName = authUser.displayName || 'Utilisateur'
        const actor = actorSnap?.exists()
          ? (actorSnap.data() as any)
          : { name: fallbackActorName, username: usernameFromName(fallbackActorName, authUser.uid), avatarUrl: authUser.photoURL || '' }
        await createAppNotification(firestore, {
          recipientId: creatorId,
          actorId: authUser.uid,
          actor: {
            name: actor.name || 'Utilisateur',
            username: actor.username || usernameFromName(actor.name || fallbackActorName, authUser.uid),
            avatarUrl: actor.avatarUrl || authUser.photoURL || '',
          },
          type: 'like',
          content: `${actor.username || actor.name || 'Un utilisateur'} a aimé votre vidéo.`,
          metadata: { videoId: video.id },
        }).catch(() => undefined)
      }
    } catch (error) {
      // Rollback on error
      setIsLiked(!newLikedState)
      setLikes(newLikedState ? likes - 1 : likes + 1)
      toast({
        title: 'Impossible de liker',
        description: "Veuillez réessayer.",
        variant: 'destructive',
      })
      console.error('Failed to update like:', error)
    }
  }

  const handleComments = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowComments(true)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: video.description,
        text: `Regardez cette vidéo de ${video.user.username}`,
        url: window.location.href,
      }).catch(() => {
        console.log('Share cancelled')
      })
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href)
      console.log('Link copied to clipboard')
    }
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!authUser) {
      router.push('/login')
      return
    }
    if (!firestore) return

    const next = !isFavorited
    setIsFavorited(next)
    try {
      const favoriteRef = doc(firestore, 'users', authUser.uid, 'favorites', video.id)
      if (next) {
        await setDoc(favoriteRef, {
          videoId: video.id,
          creatorId: (video.userRef as any)?.id || video.user?.id || null,
          description: video.description || '',
          thumbnailUrl: video.thumbnailUrl || '',
          isPaid: Boolean(video.isPaid || Number(video.price || 0) > 0),
          price: Number(video.price || 0),
          currency: video.currency || 'USD',
          createdAt: serverTimestamp(),
        })
        toast({ title: 'Ajouté aux favoris' })
      } else {
        await deleteDoc(favoriteRef)
        toast({ title: 'Retiré des favoris' })
      }
    } catch (error) {
      setIsFavorited(!next)
      toast({
        title: 'Favori impossible',
        description: 'Veuillez réessayer.',
        variant: 'destructive',
      })
    }
  }

  const handleSendComment = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!commentText.trim()) return
    if (!authUser) {
      router.push('/login')
      return
    }
    if (!firestore) return

    const text = commentText.trim()
    const newComment: Omit<VideoComment, 'id'> = {
      text,
      userId: authUser.uid,
      username: authUser.displayName || usernameFromName('Utilisateur', authUser.uid),
      avatarUrl: authUser.photoURL || '',
      createdAt: new Date(),
    }

    try {
      const commentRef = await addDoc(collection(firestore, 'videos', video.id, 'comments'), {
        ...newComment,
        createdAt: serverTimestamp(),
      })
      await updateDoc(doc(firestore, 'videos', video.id), {
        comments: increment(1),
      })
      
      // Clear input after sending
      setCommentText('')
      setCommentCount((prev) => prev + 1)
      setComments((prev) => [{ id: commentRef.id, ...newComment }, ...prev])
      
      toast({
        title: 'Commentaire envoyé',
      })
    } catch (error) {
      console.error('Failed to send comment:', error)
      toast({
        title: 'Impossible de commenter',
        description: 'Veuillez réessayer.',
        variant: 'destructive',
      })
    }
  }

  const handleCommentKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendComment(e as any)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation() // prevent video from pausing/playing
    if (locked) return
    onMuteToggle?.(!globalMuted)
  }
  
  const handleVideoClick = (event?: React.MouseEvent) => {
    if (suppressNextCardClickRef.current) {
      event?.stopPropagation()
      suppressNextCardClickRef.current = false
      return
    }
    if (locked) {
      setShowPaySheet(true)
      return
    }
    setShowDetails((prev) => !prev)
  }

  // Synchroniser le mute avec globalMuted
  useEffect(() => {
    if (videoRef.current && !locked) {
      videoRef.current.muted = globalMuted
    }
  }, [globalMuted, locked])

  useEffect(() => {
    const observedElement = isPhotoPost ? cardRef.current : videoRef.current;
    const videoElement = videoRef.current;
    if (!observedElement || locked) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
            onFeedSignal?.(video, 'view')
            if (!viewRecordedRef.current && firestore) {
              viewRecordedRef.current = true
              updateDoc(doc(firestore, 'videos', video.id), {
                views: increment(1),
              }).catch(() => {
                viewRecordedRef.current = false
              })
            }
            videoElement?.play().catch(() => {
                // Autoplay was prevented.
            });
            setIsPlaying(!isPhotoPost);
        } else {
            videoElement?.pause();
            setIsPlaying(false);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.5, // 50% of the video must be visible
      }
    );

    observer.observe(observedElement);

    return () => {
      if (observedElement) {
        observer.unobserve(observedElement);
      }
    };
  }, [firestore, isPhotoPost, locked, onFeedSignal, video]);

  useEffect(() => {
    if (locked && videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [locked]);

  useEffect(() => {
    if (!locked) {
      setShowPaySheet(false)
    }
  }, [locked]);

  useEffect(() => {
    if (!showComments || !firestore) return
    let cancelled = false

    const loadComments = async () => {
      setCommentsLoading(true)
      try {
        const commentsQuery = query(
          collection(firestore, 'videos', video.id, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const snapshot = await getDocs(commentsQuery)
        if (cancelled) return
        const loaded = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          return {
            id: docSnap.id,
            text: data.text,
            userId: data.userId,
            username: data.username,
            avatarUrl: data.avatarUrl,
          } as VideoComment
        })
        setComments(loaded)
      } catch (error) {
        console.error('Failed to load comments:', error)
      } finally {
        if (!cancelled) {
          setCommentsLoading(false)
        }
      }
    }

    loadComments()
    return () => {
      cancelled = true
    }
  }, [showComments, firestore, video.id])

  const handlePay = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!isPaidContent) return

    setIsPaying(true)
    try {
      const result = await onPay?.(video)
      if (result && result.status === 'insufficient') {
        setWalletBalance(result.balance)
        setShowFundsPrompt(true)
        return
      }
      setLocalUnlocked(true)
      setShowFundsPrompt(false)
      setShowPaySheet(false)
    } catch (error) {
      console.error('Payment failed:', error)
      setLocalUnlocked(false)
      setShowPaySheet(true)
    } finally {
      setIsPaying(false)
    }
  }

  const goToWallet = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    router.push('/wallet')
  }

  const closePaySheet = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setShowFundsPrompt(false)
    setShowPaySheet(false)
  }

  const unlockButtonLabel = isPaying ? 'Verification...' : 'Debloquer'

  const fundsMessage =
    walletBalance > 0
      ? `Votre solde est de ${walletBalance.toFixed(2)} USD. Ajoutez des fonds pour debloquer ce contenu.`
      : 'Votre portefeuille est vide. Ajoutez des fonds pour debloquer ce contenu.'

  const handlePaySheetClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleBackdropClick = () => {
    setShowPaySheet(false)
    setShowFundsPrompt(false)
  }

  const renderPaySheet = () => {
    if (!showPaySheet) return null

    return (
      <div
        className="absolute inset-0 z-30 flex items-end bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div
          className="w-full rounded-t-3xl bg-background p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] text-foreground"
          onClick={handlePaySheetClick}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Portefeuille Neysha</p>
              <h3 className="text-lg font-semibold">Debloquer ce contenu</h3>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
              {displayPrice} {displayCurrency}
            </div>
          </div>

          {!showFundsPrompt ? (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Solde du portefeuille</p>
                  <p className="text-xs text-muted-foreground">
                    Le montant sera debite uniquement si votre solde est suffisant.
                  </p>
                </div>
              </div>
              <Button className="mt-5 w-full" disabled={isPaying} onClick={handlePay}>
                {unlockButtonLabel}
              </Button>
            </>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
                {fundsMessage}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button className="w-full" onClick={goToWallet}>
                  Le faire maintenant
                </Button>
                <Button variant="outline" className="w-full" onClick={closePaySheet}>
                  Plus tard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card ref={cardRef} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden rounded-none border-0 bg-black shadow-lg" onClick={handleVideoClick}>
      {likeBursts.map((burst) => (
        <div
          key={burst.id}
          className="pointer-events-none fixed z-[60]"
          style={{ left: burst.x, top: burst.y }}
        >
          <div className="relative">
            <Heart className="absolute -left-5 -top-8 h-12 w-12 text-primary drop-shadow-glow-primary animate-like-burst" />
            <Heart className="absolute -left-12 -top-3 h-8 w-8 text-primary/80 animate-like-burst-delayed" />
            <Heart className="absolute -left-2 -top-14 h-7 w-7 text-primary/70 animate-like-burst-delayed" />
          </div>
        </div>
      ))}
      {!locked ? (
        isPhotoPost ? (
          <div
            className="absolute inset-0 touch-pan-y select-none"
            onPointerDown={handlePhotoPointerDown}
            onPointerUp={handlePhotoPointerUp}
            onPointerCancel={handlePhotoPointerCancel}
            onClick={(event) => {
              if (suppressNextCardClickRef.current) {
                event.stopPropagation()
                event.preventDefault()
                suppressNextCardClickRef.current = false
              }
            }}
          >
            <img
              src={mediaItems[activeMediaIndex]?.url || video.thumbnailUrl || video.videoUrl}
              alt={video.description || 'Publication'}
              className="h-full w-full object-cover transition-opacity duration-200"
              draggable={false}
              data-ai-hint="photo post"
            />
            {mediaItems.length > 1 && (
              <>
                <div className="absolute top-[calc(5rem+env(safe-area-inset-top))] left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                  {mediaItems.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={cn('h-1.5 w-8 rounded-full bg-white/35', activeMediaIndex === index && 'bg-primary')}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveMediaIndex(index)
                      }}
                      aria-label={`Afficher la photo ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="absolute right-4 top-[calc(7rem+env(safe-area-inset-top))] z-20 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white">
                  <Images className="h-3.5 w-3.5" />
                  <span>{activeMediaIndex + 1}/{mediaItems.length}</span>
                </div>
              </>
            )}
          </div>
        ) : (
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          className="h-full w-full object-cover"
          style={{ filter: video.filter || 'none' }}
          loop
          playsInline
          preload="metadata"
          muted={globalMuted}
          data-ai-hint="short-form video"
        />
        )
      ) : (
        <div className="absolute inset-0">
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.description}
              className="h-full w-full object-cover blur-xl scale-105"
            />
          ) : (
            <div className="h-full w-full bg-black" />
          )}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {showPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl bg-background/90 px-4 py-3 text-center shadow-lg border border-primary/30">
                <p className="text-sm font-semibold text-primary">Paiement en attente</p>
                <p className="text-xs text-muted-foreground">Nous attendons la confirmation.</p>
              </div>
            </div>
          )}
          {showFailed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl bg-background/90 px-4 py-3 text-center shadow-lg border border-destructive/40">
                <p className="text-sm font-semibold text-destructive">Paiement non abouti</p>
                <p className="text-xs text-muted-foreground">Verifiez votre portefeuille.</p>
              </div>
            </div>
          )}
        </div>
      )}
      {showDetails && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.45)_75%)]" />
        </>
      )}

      {isPaidContent && (
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-20 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          <Lock className="h-3.5 w-3.5 text-primary" />
          <span>{displayPrice} {displayCurrency}</span>
        </div>
      )}

      {locked && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-white"
          onClick={(event) => {
            event.stopPropagation()
            setShowPaySheet(true)
          }}
        >
          <div className="rounded-3xl border border-white/15 bg-black/70 px-6 py-5 text-center backdrop-blur">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="mt-3 text-base font-semibold">Contenu payant</h3>
            <p className="mt-1 text-sm text-foreground/80">
              {displayPrice} {displayCurrency}
            </p>
            <Button className="mt-4 w-full" disabled={isPaying} onClick={handlePay}>
              {unlockButtonLabel}
            </Button>
          </div>
        </div>
      )}

      {showDetails && (
        <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 text-white">
          <div className="max-w-[85%] rounded-2xl border border-white/15 bg-black/45 p-4 shadow-xl shadow-black/50 backdrop-blur-md">
            <Link href={`/u/${video.user.id}`} className="font-bold font-headline hover:underline">
              {video.user.name || video.user.username || 'Utilisateur'}
            </Link>
            <p className="text-sm text-foreground/80">{video.description}</p>
            {!isPhotoPost && video.song && (
              <div className="flex items-center gap-2 mt-2 text-sm text-foreground/80">
                <Music className="w-4 h-4" />
                <span>{video.song}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {!locked && (
        <div className="absolute right-[env(safe-area-inset-right)] bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex w-20 flex-col items-center gap-2">
        <Link href={`/u/${video.user.id}`}>
          <Avatar className="h-14 w-14 border-2 border-primary">
            <AvatarImage src={video.user.avatarUrl} alt={video.user.username} />
            <AvatarFallback>{video.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>

        {!isPhotoPost && (
	        <div className="flex flex-col items-center gap-1">
	          <Button
	            variant="ghost"
	            size="icon"
            className="rounded-full h-20 w-20 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={toggleMute}
          >
            {globalMuted ? <VolumeX className="h-20 w-20" /> : <Volume2 className="h-20 w-20" />}
          </Button>
        </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-20 w-20 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              handleLike(e)
            }}
          >
            <Heart
              className={cn(
                'h-20 w-20 transition-all',
                isLiked
                  ? 'fill-primary text-primary drop-shadow-glow-primary'
                  : ''
              )}
            />
          </Button>
          <span className="text-sm font-medium text-white text-right">
            <ClientFormattedNumber value={likes} />
	          </span>
	        </div>

	        <div className="flex flex-col items-center gap-1">
	          <Button
	            variant="ghost"
	            size="icon"
	            className="rounded-full h-20 w-20 p-0 text-white hover:bg-white/10 hover:text-white"
	            onClick={handleFavorite}
	            aria-label={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
	          >
	            <Bookmark
	              className={cn(
	                'h-20 w-20 transition-all',
	                isFavorited ? 'fill-primary text-primary drop-shadow-glow-primary' : ''
	              )}
	            />
	          </Button>
	        </div>

	        <div className="flex flex-col items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-20 w-20 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              handleComments(e)
            }}
          >
            <MessageCircle className="h-20 w-20" />
          </Button>
          <span className="text-sm font-medium text-white text-right">
            <ClientFormattedNumber value={commentCount} />
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-20 w-20 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              handleShare(e)
            }}
          >
            <Send className="h-20 w-20" />
          </Button>
          <span className="text-sm font-medium text-white text-right">
            <ClientFormattedNumber value={video.shares} />
          </span>
        </div>
      </div>
      )}

      {showComments && (
        <div
          className="absolute inset-0 z-30 flex items-end bg-black/70 backdrop-blur-sm"
          onClick={() => setShowComments(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-background text-foreground max-h-[70vh] flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-lg font-semibold">Commentaires</h3>
              <span className="text-sm text-muted-foreground">
                <ClientFormattedNumber value={commentCount} />
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5">
              {commentsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chargement des commentaires...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun commentaire pour le moment</p>
                  <p className="text-xs mt-1">Soyez le premier à commenter!</p>
                </div>
              ) : (
                <div className="space-y-4 pb-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 border border-white/10">
                        <AvatarImage src={comment.avatarUrl} alt={comment.username} />
                        <AvatarFallback>{comment.username.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{comment.username}</p>
                        <p className="text-sm text-foreground/80">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-5 pt-3 pb-3 border-t border-white/10">
              <input
                type="text"
                placeholder="Ajouter un commentaire..."
                className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleCommentKeyPress}
                onClick={(e) => e.stopPropagation()}
              />
              <Button 
                size="icon" 
                className="rounded-full h-12 w-12"
                onClick={handleSendComment}
                disabled={!commentText.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {renderPaySheet()}
    </Card>
  )
}
