'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, QrCode, X } from 'lucide-react'

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

export default function DiscoverPage() {
  const router = useRouter()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

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

  return (
    <div className="space-y-8 p-4">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-10 text-base h-12" />
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
