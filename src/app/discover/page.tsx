'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, QrCode, X, Loader2 } from 'lucide-react'
import { useFirestore } from '@/firebase/provider'
import { collection, query, where, getDocs, orderBy, limit, getDoc } from 'firebase/firestore'
import type { Video, User } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'

const trendingHashtags = [
  '#dancechallenge',
  '#comedy',
  '#tech',
  '#foodie',
  '#travel',
  '#music',
]

const popularVideos = Array.from({ length: 18 }, (_, i) => ({
  id: `pop-${i}`,
  imageUrl: `https://picsum.photos/seed/${300 + i}/300/400`,
  aiHint: 'popular video'
}))

type SearchResult = {
  type: 'video' | 'user'
  data: Video | User
}

export default function DiscoverPage() {
  const router = useRouter()
  const firestore = useFirestore()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!scannerOpen) return
    let active = true
    let raf = 0
    let detector: any = null

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }

    const scanLoop = async () => {
      if (!active || !detector || !videoRef.current) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes.length > 0) {
          const rawValue = barcodes[0].rawValue || ''
          handleScanResult(rawValue)
          setScannerOpen(false)
          return
        }
      } catch (error) {
        // Ignore scan errors
      }
      raf = requestAnimationFrame(scanLoop)
    }

    const start = async () => {
      setScanError(null)
      if (!('BarcodeDetector' in window)) {
        setScanError('Scanner QR non supporté sur cet appareil.')
        return
      }

      try {
        // @ts-ignore
        detector = new BarcodeDetector({ formats: ['qr_code'] })
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        raf = requestAnimationFrame(scanLoop)
      } catch (error) {
        console.error('QR scanner error:', error)
        setScanError("Impossible d'accéder à la caméra.")
        stopStream()
      }
    }

    start()

    return () => {
      active = false
      if (raf) cancelAnimationFrame(raf)
      stopStream()
    }
  }, [scannerOpen])

  const handleScanResult = (rawValue: string) => {
    let value = (rawValue || '').trim()
    if (!value) return

    try {
      const url = new URL(value)
      if (url.pathname.includes('/u/')) {
        const parts = url.pathname.split('/u/')
        value = parts[1] || value
      }
    } catch {
      // Not a URL
    }

    const slug = decodeURIComponent(value.replace(/^@/, '').trim())
    if (slug) {
      router.push(`/u/${slug}`)
    }
  }

  const handleSearch = async (value: string) => {
    const trimmed = value.trim()
    setSearchQuery(value)
    
    if (!trimmed || !firestore) {
      setSearchResults([])
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results: SearchResult[] = []
        const searchLower = trimmed.toLowerCase()

        // Recherche utilisateurs par username ou name
        const usersQuery = query(
          collection(firestore, 'users'),
          limit(10)
        )
        const usersSnapshot = await getDocs(usersQuery)
        usersSnapshot.docs.forEach((doc) => {
          const userData = { id: doc.id, ...doc.data() } as User
          const username = (userData.username || '').toLowerCase()
          const name = (userData.name || '').toLowerCase()
          if (username.includes(searchLower) || name.includes(searchLower)) {
            results.push({ type: 'user', data: userData })
          }
        })

        // Recherche vidéos par description
        const videosQuery = query(
          collection(firestore, 'videos'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const videosSnapshot = await getDocs(videosQuery)
        
        for (const doc of videosSnapshot.docs) {
          const videoData = doc.data()
          const description = (videoData.description || '').toLowerCase()
          if (description.includes(searchLower)) {
            // Résoudre l'utilisateur
            let user: User | null = null
            if (videoData.userRef) {
              try {
                const userDoc = await getDoc(videoData.userRef)
                if (userDoc.exists()) {
                  user = { id: userDoc.id, ...userDoc.data() } as User
                }
              } catch (error) {
                console.warn('Failed to fetch user for video:', error)
              }
            }
            
            if (user) {
              results.push({
                type: 'video',
                data: { id: doc.id, ...videoData, user } as Video
              })
            }
          }
        }

        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  return (
    <div className="space-y-8 p-4">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            className="pl-10 text-base h-12" 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
          )}
        </div>
        <Button
          variant="secondary"
          size="icon"
          className="h-12 w-12"
          onClick={() => setScannerOpen(true)}
          aria-label="Scanner un QR code"
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-headline">Résultats</h2>
          
          {searchResults.filter(r => r.type === 'user').length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Utilisateurs</h3>
              {searchResults
                .filter(r => r.type === 'user')
                .map((result) => {
                  const user = result.data as User
                  return (
                    <Link
                      key={user.id}
                      href={`/u/${user.username?.replace(/^@/, '') || user.id}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
                    >
                      <Avatar className="h-12 w-12 border-2 border-primary">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.username}</p>
                      </div>
                    </Link>
                  )
                })}
            </div>
          )}

          {searchResults.filter(r => r.type === 'video').length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Vidéos</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
                {searchResults
                  .filter(r => r.type === 'video')
                  .map((result) => {
                    const video = result.data as Video
                    return (
                      <Card key={video.id} className="overflow-hidden aspect-[3/4] border-0 rounded-none cursor-pointer">
                        <CardContent className="p-0">
                          <div className="relative h-full w-full">
                            <Image 
                              src={video.thumbnailUrl} 
                              alt={video.description} 
                              fill 
                              className="object-cover" 
                              data-ai-hint="search result video"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <>
          <div>
            <h2 className="text-xl font-bold font-headline mb-4">Tendances</h2>
            <div className="flex flex-wrap gap-2">
              {trendingHashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm px-3 py-1.5 hover:bg-accent cursor-pointer">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold font-headline mb-4">Populaire</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
              {popularVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden aspect-[3/4] border-0 rounded-none">
                  <CardContent className="p-0">
                    <div className="relative h-full w-full">
                      <Image src={video.imageUrl} alt="Popular video" fill className="object-cover" data-ai-hint={video.aiHint} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm">
          <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-[calc(1rem+env(safe-area-inset-right))]">
            <Button variant="ghost" size="icon" className="h-11 w-11 text-white" onClick={() => setScannerOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
            <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-3xl border border-white/20 bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              <div className="absolute inset-0 border-2 border-primary/60 rounded-3xl pointer-events-none" />
            </div>
            {scanError ? (
              <p className="text-sm text-red-400">{scanError}</p>
            ) : (
              <p className="text-sm text-white/80">Scannez le QR code d’un créateur</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
