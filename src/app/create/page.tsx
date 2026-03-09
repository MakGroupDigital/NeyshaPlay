'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { X, Music, RefreshCw, Zap, Sparkles, Timer, Flashlight, Wand2, Send, RotateCcw, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useDoc, useUser } from '@/firebase'
import { useFirestore } from '@/firebase/provider'
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore'
import { uploadVideoToCloudinary, getVideoThumbnail } from '@/lib/cloudinary'
import type { User } from '@/lib/types'

const MAX_RECORDING_SECONDS = 15

const cameraOptions = [
    { id: 'flip', icon: RefreshCw, label: 'Retourner' },
    { id: 'speed', icon: Zap, label: 'Vitesse' },
    { id: 'filters', icon: Sparkles, label: 'Filtres' },
    { id: 'smooth', icon: Wand2, label: 'Lissage' },
    { id: 'timer', icon: Timer, label: 'Minuteur' },
    { id: 'flash', icon: Flashlight, label: 'Flash' },
]

const filters = [
  { name: 'Aucun', value: 'none' },
  { name: 'Grayscale', value: 'grayscale(100%)' },
  { name: 'Sepia', value: 'sepia(100%)' },
  { name: 'Invert', value: 'invert(100%)' },
  { name: 'Saturate', value: 'saturate(2)' },
  { name: 'Hue-Rotate', value: 'hue-rotate(90deg)' },
  { name: 'Contrast', value: 'contrast(200%)' },
  { name: 'Brightness', value: 'brightness(150%)' }
]

const speeds = [1, 2, 3, 0.5, 0.3]

export default function CreatePage() {
  const { toast } = useToast()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const { user, loading: userLoading } = useUser()
  const firestore = useFirestore()

  const userProfileRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc<User>(userProfileRef)

  const [hasCameraPermission, setHasCameraPermission] = useState(true)
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [activeCameraIndex, setActiveCameraIndex] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [currentFilterIndex, setCurrentFilterIndex] = useState(0)
  const [recordedFilter, setRecordedFilter] = useState('none')
  const [currentSpeedIndex, setCurrentSpeedIndex] = useState(0)
  const [showSmoothingSlider, setShowSmoothingSlider] = useState(false)
  const [smoothingValue, setSmoothingValue] = useState(0)

  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null)
  const [recordingProgress, setRecordingProgress] = useState(0)
  
  const [step, setStep] = useState<'recording' | 'preview' | 'publish'>('recording')
  const [caption, setCaption] = useState('')
  const [isPaidContent, setIsPaidContent] = useState(false)
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD')
  const [isPublishing, setIsPublishing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const combinedFilter = `${filters[currentFilterIndex].value} blur(${smoothingValue / 10}px)`.replace('none', '').trim()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour créer une vidéo.',
      })
      router.push('/login')
    }
  }, [user, userLoading, router, toast])
  
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        setRecordedFilter(combinedFilter)
        setTimeout(() => {
            toast({ title: "Enregistrement terminé !" })
        }, 0)
    }
  }, [toast, combinedFilter])

  const getCameraPermission = useCallback(async () => {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }

        const activeCamera = cameras[activeCameraIndex]
        const deviceId = activeCamera?.deviceId

        const newStream = await navigator.mediaDevices.getUserMedia({ 
            video: { deviceId: deviceId ? { exact: deviceId } : undefined }, 
            audio: true 
        })
        
        const videoTrack = newStream.getVideoTracks()[0]
        if (videoTrack) {
          const settings = videoTrack.getSettings()
          const capabilities = videoTrack.getCapabilities()
          // @ts-ignore
          setHasFlash(!!capabilities.torch)
        } else {
          setHasFlash(false)
        }
        
        setStream(newStream)
        setHasCameraPermission(true)

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }

      } catch (error) {
        console.error('Error accessing camera:', error)
        setHasCameraPermission(false)
        toast({
          variant: 'destructive',
          title: 'Accès à la caméra refusé',
          description: "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.",
        })
      }
  }, [activeCameraIndex, cameras, stream, toast])

  useEffect(() => {
    const enumerateDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter(device => device.kind === 'videoinput')
            setCameras(videoDevices)
            const frontCameraIndex = videoDevices.findIndex(d => d.label.toLowerCase().includes('front'))
            if (frontCameraIndex !== -1) {
              setActiveCameraIndex(frontCameraIndex)
            }
        } catch (error) {
            console.error("Could not enumerate devices:", error)
            setHasCameraPermission(false)
        }
    }
    enumerateDevices()
  }, [])
  
  useEffect(() => {
    if (step === 'recording') {
      getCameraPermission()
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCameraIndex, step])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingProgress(prev => {
          const next = prev + (100 / MAX_RECORDING_SECONDS)
          if (next >= 100) {
            handleStopRecording()
            return 100
          }
          return next
        })
      }, 1000)
    } else {
      setRecordingProgress(0)
    }

    return () => clearInterval(interval)
  }, [isRecording, handleStopRecording])
  
  const handleStartRecording = () => {
    if (stream && videoRef.current && hasCameraPermission) {
        recordedChunksRef.current = []
        const options = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ].find(type => MediaRecorder.isTypeSupported(type))

        if (!options) {
            toast({ title: 'Format vidéo non supporté', variant: 'destructive'})
            return
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: options })
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data)
            }
        }
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: options })
            const url = URL.createObjectURL(blob)
            setRecordedBlob(blob)
            setRecordedMimeType(options)
            setRecordedVideoUrl(url)
            setStep('preview')
        }
        mediaRecorderRef.current.start()
        setIsRecording(true)
        toast({ title: "L'enregistrement a commencé !" })
    } else {
        toast({ title: 'Impossible de démarrer', variant: 'destructive'})
    }
  }

  const handleRecordButtonClick = () => {
      if (isRecording) {
          handleStopRecording()
      } else {
          handleStartRecording()
      }
  }
  
  const handleRetake = () => {
    setRecordedVideoUrl(null)
    setRecordedBlob(null)
    setRecordedMimeType(null)
    setIsRecording(false)
    setRecordingProgress(0)
    setCaption('')
    setStep('recording')
    setRecordedFilter('none')
  }
  
  const handlePost = async () => {
    if (!firestore || !user || !recordedBlob) {
        toast({
            title: 'Erreur',
            description: 'Impossible de publier.',
            variant: 'destructive',
        })
        return
    }
    if (!profile?.gender) {
        toast({
            title: 'Sexe requis',
            description: 'Veuillez définir votre sexe dans les paramètres avant de publier.',
            variant: 'destructive',
        })
        router.push('/settings')
        return
    }

    const parsedPrice = Number(price.replace(',', '.'))
    if (isPaidContent && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
        toast({
            title: 'Prix invalide',
            description: 'Veuillez saisir un prix valide pour le contenu payant.',
            variant: 'destructive',
        })
        return
    }

    setIsPublishing(true)
    setUploadProgress(0)

    // Optimistic UI: Create temporary video entry and redirect immediately
    const tempVideoId = `temp_${Date.now()}`
    const userDocRef = doc(firestore, 'users', user.uid)
    
    toast({
        title: 'Publication en cours...',
        description: 'Votre vidéo est en cours de téléversement. Vous pouvez continuer à naviguer.',
    })
    
    // Redirect immediately
    router.push('/')

    try {
      // Upload to Cloudinary in background
      const cloudinaryResponse = await uploadVideoToCloudinary(
        recordedBlob,
        (progress) => setUploadProgress(progress)
      )

      const thumbnailUrl = getVideoThumbnail(cloudinaryResponse.public_id)

      // Create video document in Firestore
      const newVideo = {
        userRef: userDocRef,
        videoUrl: cloudinaryResponse.secure_url,
        thumbnailUrl: thumbnailUrl,
        description: caption || 'Nouvelle vidéo',
        song: 'Son original',
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: serverTimestamp(),
        filter: recordedFilter,
        cloudinaryPublicId: cloudinaryResponse.public_id,
        isPaid: isPaidContent,
        price: isPaidContent ? parsedPrice : 0,
        currency: isPaidContent ? currency : 'USD',
        creatorGender: profile.gender,
      }

      await addDoc(collection(firestore, 'videos'), newVideo)

      console.log('Video published successfully')
      
    } catch (error) {
      console.error("Error publishing video: ", error)
      toast({
        title: 'Erreur de publication',
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleOptionClick = (id: string) => {
    if (step !== 'recording') return

    if (id === 'flip') {
        setActiveCameraIndex(prevIndex => (prevIndex + 1) % (cameras.length || 1))
    } else if (id === 'flash') {
        if (hasFlash && stream) {
            const videoTrack = stream.getVideoTracks()[0]
            const nextFlashState = !isFlashOn
            // @ts-ignore
            videoTrack.applyConstraints({
                // @ts-ignore
                advanced: [{ torch: nextFlashState }]
            }).then(() => {
                setIsFlashOn(nextFlashState)
                 toast({ title: `Flash ${nextFlashState ? 'activé' : 'désactivé'}` })
            }).catch(e => {
                console.error("Failed to apply flash", e)
                toast({ title: 'Erreur', description: 'Impossible de contrôler le flash.', variant: 'destructive' })
            })
        } else {
            toast({ title: 'Flash non disponible' })
        }
    } else if (id === 'filters') {
        const nextFilterIndex = (currentFilterIndex + 1) % filters.length
        setCurrentFilterIndex(nextFilterIndex)
        toast({ title: `Filtre: ${filters[nextFilterIndex].name}` })
    } else if (id === 'speed') {
        const nextSpeedIndex = (currentSpeedIndex + 1) % speeds.length
        setCurrentSpeedIndex(nextSpeedIndex)
        if (videoRef.current) {
            videoRef.current.playbackRate = speeds[nextSpeedIndex]
        }
        toast({ title: `Vitesse: ${speeds[nextSpeedIndex]}x` })
    } else if (id === 'smooth') {
        setShowSmoothingSlider(!showSmoothingSlider)
    } else {
        toast({ title: 'Fonctionnalité à venir' })
    }
  }

  // Show loading while checking authentication
  if (userLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // User must be authenticated (redirect handled by useEffect above)
  if (!user) {
    return null
  }

  if (step === 'publish') {
    return (
      <div className="relative min-h-[100dvh] w-full bg-background text-foreground flex flex-col md:flex-row items-center justify-center gap-4 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-20 text-white rounded-full bg-black/50 hover:bg-black/70 hover:text-white"
          onClick={() => setStep('preview')}
          disabled={isPublishing}
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
        
        <div className="relative aspect-[9/16] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl">
          {recordedVideoUrl && <video
            src={recordedVideoUrl}
            className={cn(
              "h-full w-full object-cover"
            )}
            style={{ filter: recordedFilter }}
            autoPlay
            playsInline
            loop
            muted
          />}
        </div>

        <div className="w-full max-w-sm space-y-4">
          {!profile?.gender && (
            <Alert variant="destructive">
              <AlertTitle>Sexe obligatoire</AlertTitle>
              <AlertDescription>
                Définissez votre sexe dans les paramètres pour pouvoir publier.
              </AlertDescription>
            </Alert>
          )}
          <Textarea
            placeholder="Écrivez une légende et ajoutez des #hashtags..."
            className="h-32 text-base"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={isPublishing}
          />
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm">Contenu payant</Label>
                <p className="text-xs text-muted-foreground">
                  Activez pour vendre ce contenu à vos abonnés.
                </p>
              </div>
              <Switch
                checked={isPaidContent}
                onCheckedChange={(checked) => {
                  setIsPaidContent(checked)
                  if (!checked) {
                    setPrice('')
                  }
                }}
                disabled={isPublishing}
              />
            </div>
            {isPaidContent && (
              <div className="grid grid-cols-[1fr,auto] gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="Prix"
                  className="h-11 text-base"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isPublishing}
                />
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'USD' | 'CDF')}
                  disabled={isPublishing}
                >
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
            )}
          </div>
          {isPublishing && (
             <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">Téléversement : {Math.round(uploadProgress)}%</p>
            </div>
          )}
          <Button size="lg" className="w-full text-lg font-semibold" onClick={handlePost} disabled={isPublishing}>
              {isPublishing ? <Loader2 className="animate-spin h-6 w-6"/> : 'Publier'}
              {!isPublishing && <Send className="ml-2 h-5 w-5"/>}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'preview') {
    return (
      <div className="relative h-[100dvh] w-full bg-black">
        {recordedVideoUrl && <video
          src={recordedVideoUrl}
          className={cn(
              "h-full w-full object-cover"
          )}
          style={{ filter: recordedFilter }}
          autoPlay
          playsInline
          loop
          muted
        />}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-20">
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-white rounded-full bg-black/50 hover:bg-black/70 hover:text-white"
                onClick={handleRetake}
            >
                <RotateCcw className="h-6 w-6" />
            </Button>
        </div>
        <div className="absolute bottom-[calc(2.5rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-20">
             <Button size="lg" className="text-lg font-semibold" onClick={() => setStep('publish')}>
                Suivant
                <ArrowRight className="ml-2 h-5 w-5"/>
            </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black">
       <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-[calc(1rem+env(safe-area-inset-left))] z-20 text-white rounded-full bg-black/50 hover:bg-black/70 hover:text-white"
        onClick={() => router.back()}
      >
        <X className="h-6 w-6" />
      </Button>

      {step === 'recording' && (
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-20">
          <Button variant="secondary" className="bg-black/50 hover:bg-black/70 rounded-full text-sm text-white" onClick={() => handleOptionClick('sound')}>
              <Music className="mr-2 h-4 w-4 text-primary" />
              Ajouter un son
          </Button>
        </div>
      )}
      
      {showSmoothingSlider && step === 'recording' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-64 bg-black/50 rounded-lg p-4">
            <Slider
              defaultValue={[smoothingValue]}
              max={100}
              step={1}
              onValueChange={(value) => setSmoothingValue(value[0])}
            />
        </div>
      )}

      <div className="relative h-full w-full flex items-center justify-center">
        <video
          ref={videoRef}
          className={cn(
            "h-full w-full object-cover transition-all duration-300"
          )}
          style={{ filter: combinedFilter }}
          autoPlay
          muted
          playsInline
        />
        {!hasCameraPermission && (
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-black">
            <Alert variant="destructive" className="max-w-sm">
                <AlertTitle>Accès à la caméra requis</AlertTitle>
                <AlertDescription>
                Veuillez autoriser l'accès à la caméra.
                </AlertDescription>
            </Alert>
          </div>
        )}
        {isRecording && (
          <Progress value={recordingProgress} className="absolute top-[env(safe-area-inset-top)] left-0 w-full h-1.5 rounded-none" />
        )}
      </div>

      {step === 'recording' && (
        <>
          <div className="absolute top-1/2 -translate-y-1/2 right-[calc(1rem+env(safe-area-inset-right))] z-20 flex flex-col gap-4">
            {cameraOptions.map((option) => (
                <div key={option.id} className="flex flex-col items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "rounded-full bg-black/50 hover:bg-black/70 h-12 w-12 text-white hover:text-white",
                        option.id === 'flash' && isFlashOn && "text-yellow-400"
                      )} 
                      onClick={() => handleOptionClick(option.id)} 
                      disabled={(option.id === 'flip' && cameras.length < 2) || (option.id === 'flash' && !hasFlash)}
                    >
                        <option.icon className="h-6 w-6" />
                    </Button>
                    <span className="text-white text-xs font-medium">{option.label}</span>
                </div>
            ))}
          </div>
        
          <div className="absolute bottom-[calc(2.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
            <button
                onClick={handleRecordButtonClick}
                className={cn(
                  "w-20 h-20 rounded-full border-4 border-white/50 transition-all duration-200 flex items-center justify-center",
                  isRecording ? "bg-white/70" : "bg-primary/70 hover:bg-primary"
                )}
                disabled={!hasCameraPermission}
              >
                {isRecording && <div className="w-8 h-8 rounded-md bg-primary" />}
                <span className="sr-only">{isRecording ? "Arrêter" : "Enregistrer"}</span>
              </button>
              <span className="text-white text-sm font-semibold">Vidéo</span>
          </div>
        </>
      )}
    </div>
  )
}
