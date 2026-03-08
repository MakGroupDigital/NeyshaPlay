'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { Video } from '@/lib/types'
import { Heart, MessageCircle, Send, Music, Volume2, VolumeX, Lock, CreditCard, Smartphone, Wallet, ShoppingBag } from 'lucide-react'
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

type PaymentMethod = 'mobile-money' | 'card' | 'wallet'

type VideoCardProps = {
  video: Video
  isLocked?: boolean
  onPay?: (video: Video, method: PaymentMethod) => Promise<void> | void
}

type VideoComment = {
  id: string
  text: string
  userId: string
  username: string
  avatarUrl?: string
  createdAt?: Date
}

export function VideoCard({ video, isLocked = false, onPay }: VideoCardProps) {
  const firestore = useFirestore()
  const { user: authUser } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false)
  const [likes, setLikes] = useState(video.likes)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPaySheet, setShowPaySheet] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentCount, setCommentCount] = useState(video.comments)
  const [comments, setComments] = useState<VideoComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile-money')
  const [isPaying, setIsPaying] = useState(false)
  const [localUnlocked, setLocalUnlocked] = useState(false)
  const [likeBursts, setLikeBursts] = useState<Array<{ id: string; x: number; y: number }>>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const numericPrice = typeof video.price === 'number' ? video.price : Number(video.price || 0)
  const isPaidContent = Boolean((video.isPaid ?? false) || numericPrice > 0)
  const locked = isPaidContent && isLocked && !localUnlocked
  const displayPrice = Number.isFinite(numericPrice) ? numericPrice : 0
  const displayCurrency = video.currency ?? 'USD'

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
      if (newLikedState) {
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
      username: authUser.displayName || authUser.email?.split('@')[0] || 'Utilisateur',
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
    if (videoRef.current) {
        videoRef.current.muted = !videoRef.current.muted
        setIsMuted(videoRef.current.muted)
    }
  }
  
  const handleVideoClick = () => {
    if (locked) {
      setShowPaySheet(true)
      return
    }
    if (videoRef.current) {
        if(videoRef.current.paused) {
            videoRef.current.play()
            setIsPlaying(true)
        } else {
            videoRef.current.pause()
            setIsPlaying(false)
        }
    }
  }

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || locked) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
            videoElement.play().catch(() => {
                // Autoplay was prevented.
            });
            setIsPlaying(true);
        } else {
            videoElement.pause();
            setIsPlaying(false);
        }
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.5, // 50% of the video must be visible
      }
    );

    observer.observe(videoElement);

    return () => {
      if (videoElement) {
        observer.unobserve(videoElement);
      }
    };
  }, [locked]);

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
    setLocalUnlocked(true)
    setShowPaySheet(false)

    try {
      await onPay?.(video, paymentMethod)
    } catch (error) {
      console.error('Payment failed:', error)
      setLocalUnlocked(false)
      setShowPaySheet(true)
    } finally {
      setIsPaying(false)
    }
  }


  return (
    <Card className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden rounded-none border-0 bg-black shadow-lg" onClick={handleVideoClick}>
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
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          className="h-full w-full object-cover"
          style={{ filter: video.filter || 'none' }}
          loop
          playsInline
          preload="metadata"
          muted={isMuted}
          data-ai-hint="short-form video"
        />
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
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.45)_75%)]" />

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
            <h3 className="mt-3 text-base font-semibold">Acheter ce contenu</h3>
            <p className="mt-1 text-sm text-foreground/80">
              {displayPrice} {displayCurrency}
            </p>
            <Button className="mt-4 w-full" onClick={() => setShowPaySheet(true)}>
              Acheter
            </Button>
          </div>
        </div>
      )}

      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 text-white">
        <div className="max-w-[85%] rounded-2xl border border-white/15 bg-black/45 p-4 shadow-xl shadow-black/50 backdrop-blur-md">
          <Link href={`/u/${video.user.id}`} className="font-bold font-headline hover:underline">
            {video.user.username}
          </Link>
          <p className="text-sm text-foreground/80">{video.description}</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-foreground/80">
            <Music className="w-4 h-4" />
            <span>{video.song}</span>
          </div>
        </div>
      </div>
      
      {!locked && (
        <div className="absolute right-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col items-end gap-3">
        <Link href={`/u/${video.user.id}`}>
          <Avatar className="h-12 w-12 border-2 border-primary">
            <AvatarImage src={video.user.avatarUrl} alt={video.user.username} />
            <AvatarFallback>{video.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-16 w-16 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-16 w-16" /> : <Volume2 className="h-16 w-16" />}
          </Button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-16 w-16 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              handleLike(e)
            }}
          >
            <Heart
              className={cn(
                'h-16 w-16 transition-all',
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
            className="rounded-full h-16 w-16 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              handleComments(e)
            }}
          >
            <MessageCircle className="h-16 w-16" />
          </Button>
          <span className="text-sm font-medium text-white text-right">
            <ClientFormattedNumber value={commentCount} />
          </span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-16 w-16 p-0 text-white hover:bg-white/10 hover:text-white"
            onClick={(e) => {
              e.stopPropagation()
              handleShare(e)
            }}
          >
            <Send className="h-16 w-16" />
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
                className="rounded-full h-10 w-10"
                onClick={handleSendComment}
                disabled={!commentText.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPaySheet && (
        <div
          className="absolute inset-0 z-30 flex items-end bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPaySheet(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-background p-5 text-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paiement</p>
                <h3 className="text-lg font-semibold">Débloquer ce contenu</h3>
              </div>
              <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
                {displayPrice} {displayCurrency}
              </div>
            </div>

            <RadioGroup
              className="mt-4 space-y-3"
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Mobile Money</p>
                    <p className="text-xs text-muted-foreground">M‑Pesa, Airtel, Orange</p>
                  </div>
                </div>
                <RadioGroupItem value="mobile-money" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Carte bancaire</p>
                    <p className="text-xs text-muted-foreground">Visa / Mastercard</p>
                  </div>
                </div>
                <RadioGroupItem value="card" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Solde Neysha</p>
                    <p className="text-xs text-muted-foreground">Utiliser votre portefeuille</p>
                  </div>
                </div>
                <RadioGroupItem value="wallet" />
              </label>
            </RadioGroup>

            <Button className="mt-5 w-full" disabled={isPaying} onClick={handlePay}>
              {isPaying ? 'Paiement en cours...' : `Payer ${displayPrice} ${displayCurrency}`}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
