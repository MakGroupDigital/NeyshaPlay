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
  { name: 'Neo Noir', value: 'contrast(1.35) saturate(0.85) brightness(0.9)' },
  { name: 'Cinema Teal', value: 'contrast(1.2) saturate(1.15) hue-rotate(-18deg) brightness(1.02)' },
  { name: 'Sunset Pop', value: 'contrast(1.18) saturate(1.35) hue-rotate(12deg) brightness(1.06)' },
  { name: 'Warm Glow', value: 'sepia(0.28) saturate(1.25) contrast(1.05) brightness(1.05)' },
  { name: 'Cool Mist', value: 'saturate(0.9) hue-rotate(-12deg) brightness(1.04) contrast(1.02)' },
  { name: 'Neon Night', value: 'saturate(1.6) contrast(1.3) brightness(0.95)' },
  { name: 'Candy', value: 'saturate(1.5) contrast(1.1) brightness(1.08) hue-rotate(6deg)' },
  { name: 'Retro Film', value: 'sepia(0.22) contrast(1.15) saturate(0.9) brightness(0.95)' },
  { name: 'Dreamy', value: 'brightness(1.08) contrast(0.96) saturate(1.15)' },
  { name: 'Street', value: 'contrast(1.25) saturate(0.95) brightness(0.98)' },
]

const speeds = [1, 2, 3, 0.5, 0.3]

type CameraQuality = 'hd' | '4k' | '8k'

const qualityPresets: Record<CameraQuality, { label: string; width: number; height: number }> = {
  hd: { label: 'HD', width: 1280, height: 720 },
  '4k': { label: '4K', width: 3840, height: 2160 },
  '8k': { label: '8K', width: 7680, height: 4320 },
}

type InternalSound = {
  id: string
  title: string
  url: string
}

const internalSounds: InternalSound[] = [
  { id: 'aurora', title: 'Aurora Glow', url: '/sounds/aurora.wav' },
  { id: 'pulse', title: 'Pulse Drive', url: '/sounds/pulse.wav' },
  { id: 'chill', title: 'Midnight Chill', url: '/sounds/chill.wav' },
]

export default function CreatePage() {
  const { toast } = useToast()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const toastRef = useRef(toast)
  const soundSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const soundGainRef = useRef<GainNode | null>(null)
  const micGainRef = useRef<GainNode | null>(null)
  const mixDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mixedStreamRef = useRef<MediaStream | null>(null)
  const soundStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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
  const [frontCameraIndex, setFrontCameraIndex] = useState<number | null>(null)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [recordQuality, setRecordQuality] = useState<CameraQuality>('hd')
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [soundQuery, setSoundQuery] = useState('')
  const [soundUrlInput, setSoundUrlInput] = useState('')
  const [selectedSoundUrl, setSelectedSoundUrl] = useState<string | null>(null)
  const [selectedSoundTitle, setSelectedSoundTitle] = useState<string | null>(null)
  const [selectedSoundSource, setSelectedSoundSource] = useState<'none' | 'device' | 'url' | 'catalog'>('none')
  const [isSoundReady, setIsSoundReady] = useState(false)
  const [isSoundPlaying, setIsSoundPlaying] = useState(false)
  const [soundVolume, setSoundVolume] = useState(0.7)
  const [micVolume, setMicVolume] = useState(1)
  const [soundDuration, setSoundDuration] = useState(0)
  const [soundTrimStart, setSoundTrimStart] = useState(0)
  const [soundTrimLength, setSoundTrimLength] = useState(10)
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

  const baseFilter = filters[currentFilterIndex].value === 'none' ? '' : filters[currentFilterIndex].value
  const smoothStrength = smoothingValue / 100
  const smoothBlur = smoothStrength * 3.5
  const smoothingFilter =
    smoothStrength > 0
      ? `blur(${smoothBlur.toFixed(2)}px) brightness(${1 + smoothStrength * 0.06}) contrast(${1 - smoothStrength * 0.08}) saturate(${1 + smoothStrength * 0.06})`
      : ''
  const combinedFilter = [baseFilter, smoothingFilter].filter(Boolean).join(' ').trim() || 'none'

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const ensureAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      const AudioContextConstructor =
        // @ts-ignore
        window.AudioContext || window.webkitAudioContext
      audioContextRef.current = new AudioContextConstructor()
    }
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
      } catch {
        // ignore
      }
    }
    return audioContextRef.current
  }, [])

  const setupAudioGraph = useCallback(async () => {
    if (!stream || !audioRef.current || !selectedSoundUrl) {
      mixedStreamRef.current = null
      setIsSoundReady(false)
      return
    }

    const ctx = await ensureAudioContext()
    if (!ctx) return

    soundSourceRef.current?.disconnect()
    micSourceRef.current?.disconnect()
    soundGainRef.current?.disconnect()
    micGainRef.current?.disconnect()
    mixDestinationRef.current?.disconnect()

    const destination = ctx.createMediaStreamDestination()
    mixDestinationRef.current = destination

    const soundSource =
      soundSourceRef.current || ctx.createMediaElementSource(audioRef.current)
    soundSourceRef.current = soundSource

    const soundGain = ctx.createGain()
    soundGain.gain.value = soundVolume
    soundGainRef.current = soundGain

    soundSource.connect(soundGain)
    soundGain.connect(destination)
    soundGain.connect(ctx.destination)

    const micTracks = stream.getAudioTracks()
    if (micTracks.length > 0) {
      const micStream = new MediaStream([micTracks[0]])
      const micSource = ctx.createMediaStreamSource(micStream)
      micSourceRef.current = micSource

      const micGain = ctx.createGain()
      micGain.gain.value = micVolume
      micGainRef.current = micGain

      micSource.connect(micGain).connect(destination)
    } else {
      micSourceRef.current = null
      micGainRef.current = null
    }

    mixedStreamRef.current = destination.stream
    setIsSoundReady(true)
  }, [stream, selectedSoundUrl, soundVolume, micVolume, ensureAudioContext])
  
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

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!selectedSoundUrl) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setIsSoundReady(false)
      setSoundDuration(0)
      setSoundTrimStart(0)
      setSoundTrimLength(10)
      return
    }

    audio.src = selectedSoundUrl
    audio.load()
    const handleLoaded = () => {
      setIsSoundReady(true)
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      setSoundDuration(duration)
      setSoundTrimStart(0)
      setSoundTrimLength(Math.min(15, Math.max(3, duration || 10)))
    }
    const handleError = () => {
      setIsSoundReady(false)
      toastRef.current({
        title: 'Lecture impossible',
        description: 'Format audio non supporte par ce navigateur.',
        variant: 'destructive',
      })
    }
    audio.addEventListener('loadedmetadata', handleLoaded)
    audio.addEventListener('canplay', handleLoaded)
    audio.addEventListener('error', handleError)
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoaded)
      audio.removeEventListener('canplay', handleLoaded)
      audio.removeEventListener('error', handleError)
    }
  }, [selectedSoundUrl])

  useEffect(() => {
    if (soundGainRef.current) {
      soundGainRef.current.gain.value = soundVolume
    }
    if (micGainRef.current) {
      micGainRef.current.gain.value = micVolume
    }
  }, [soundVolume, micVolume])

  useEffect(() => {
    if (selectedSoundUrl) {
      setupAudioGraph()
    } else {
      mixedStreamRef.current = null
    }
  }, [selectedSoundUrl, stream, setupAudioGraph])

  useEffect(() => {
    return () => {
      if (selectedSoundSource === 'device' && selectedSoundUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedSoundUrl)
      }
    }
  }, [selectedSoundSource, selectedSoundUrl])
  
  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        setIsRecording(false)
        setRecordedFilter(combinedFilter)
        setTimeout(() => {
            toast({ title: "Enregistrement terminé !" })
        }, 0)
    }
    if (soundStopTimeoutRef.current) {
      clearTimeout(soundStopTimeoutRef.current)
      soundStopTimeoutRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      setIsSoundPlaying(false)
    }
  }, [toast, combinedFilter])

  const stopSoundPlayback = useCallback(() => {
    if (soundStopTimeoutRef.current) {
      clearTimeout(soundStopTimeoutRef.current)
      soundStopTimeoutRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsSoundPlaying(false)
  }, [])

  const playSoundFromTrim = useCallback(async () => {
    if (!audioRef.current || !selectedSoundUrl) return
    await ensureAudioContext()
    const audio = audioRef.current
    const start = Math.max(0, Math.min(soundTrimStart, Math.max(0, soundDuration - 0.1)))
    const length = Math.max(1, Math.min(soundTrimLength, soundDuration || soundTrimLength))
    audio.currentTime = start
    try {
      await audio.play()
      setIsSoundPlaying(true)
      if (soundStopTimeoutRef.current) {
        clearTimeout(soundStopTimeoutRef.current)
      }
      soundStopTimeoutRef.current = setTimeout(() => {
        stopSoundPlayback()
      }, length * 1000)
    } catch {
      setIsSoundPlaying(false)
    }
  }, [ensureAudioContext, selectedSoundUrl, soundTrimStart, soundTrimLength, soundDuration, stopSoundPlayback])

  const clearSoundSelection = useCallback(() => {
    if (selectedSoundSource === 'device' && selectedSoundUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(selectedSoundUrl)
    }
    setSelectedSoundUrl(null)
    setSelectedSoundTitle(null)
    setSelectedSoundSource('none')
    setSoundUrlInput('')
    setIsSoundReady(false)
    setIsSoundPlaying(false)
    setSoundDuration(0)
    setSoundTrimStart(0)
    setSoundTrimLength(10)
  }, [selectedSoundSource, selectedSoundUrl])

  const handleSoundFile = useCallback(
    async (file: File) => {
      if (!file) return
      await ensureAudioContext()
      if (selectedSoundSource === 'device' && selectedSoundUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedSoundUrl)
      }
      const url = URL.createObjectURL(file)
      setSelectedSoundUrl(url)
      setSelectedSoundTitle(file.name)
      setSelectedSoundSource('device')
      setSoundUrlInput('')
    },
    [ensureAudioContext, selectedSoundSource, selectedSoundUrl]
  )

  const handleSoundUrl = useCallback(
    async () => {
      const url = soundUrlInput.trim()
      if (!url) return
      await ensureAudioContext()
      if (selectedSoundSource === 'device' && selectedSoundUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedSoundUrl)
      }
      setSelectedSoundUrl(url)
      setSelectedSoundTitle(url.replace(/^https?:\/\//, '').slice(0, 48))
      setSelectedSoundSource('url')
    },
    [ensureAudioContext, selectedSoundSource, selectedSoundUrl, soundUrlInput]
  )

  const handleInternalSound = useCallback(
    async (sound: InternalSound) => {
      await ensureAudioContext()
      if (selectedSoundSource === 'device' && selectedSoundUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedSoundUrl)
      }
      setSelectedSoundUrl(sound.url)
      setSelectedSoundTitle(sound.title)
      setSelectedSoundSource('catalog')
      setSoundUrlInput('')
      toast({ title: 'Son sélectionné', description: sound.title })
    },
    [ensureAudioContext, selectedSoundSource, selectedSoundUrl, toast]
  )

  const openSoundPlatform = useCallback(() => {
    const query = soundQuery.trim()
    const url = query
      ? `https://pixabay.com/music/search/${encodeURIComponent(query)}/`
      : 'https://pixabay.com/music/'
    window.open(url, '_blank', 'noopener,noreferrer')
    toast({
      title: 'Recherche ouverte',
      description: "Téléchargez un son puis importez-le depuis l'appareil ou via URL directe.",
    })
  }, [soundQuery, toast])

  const extractAudioFromVideo = useCallback(
    async (file: File) => {
      if (!window.MediaRecorder) {
        toast({
          title: 'Extraction non supportée',
          description: "Votre navigateur ne supporte pas l'extraction audio. Utilisez un fichier audio.",
          variant: 'destructive',
        })
        return
      }

      await ensureAudioContext()

      const videoUrl = URL.createObjectURL(file)
      const videoEl = document.createElement('video')
      videoEl.src = videoUrl
      videoEl.crossOrigin = 'anonymous'
      videoEl.muted = false
      videoEl.volume = 1
      videoEl.playsInline = true

      const loadMetadata = () =>
        new Promise<void>((resolve, reject) => {
          videoEl.onloadedmetadata = () => resolve()
          videoEl.onerror = () => reject(new Error('Video load failed'))
        })

      try {
        await loadMetadata()
      } catch (error) {
        URL.revokeObjectURL(videoUrl)
        toast({
          title: 'Impossible de lire la vidéo',
          description: "Le fichier vidéo n'est pas supporté.",
          variant: 'destructive',
        })
        return
      }

      const ctx = audioContextRef.current
      if (!ctx) {
        URL.revokeObjectURL(videoUrl)
        return
      }

      const destination = ctx.createMediaStreamDestination()
      const source = ctx.createMediaElementSource(videoEl)
      const silentGain = ctx.createGain()
      silentGain.gain.value = 0
      source.connect(destination)
      source.connect(silentGain).connect(ctx.destination)

      const tester = audioRef.current || document.createElement('audio')
      const mimeTypes = [
        'audio/mp4',
        'audio/aac',
        'audio/m4a',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ]
      const mimeType =
        mimeTypes.find(
          (type) =>
            MediaRecorder.isTypeSupported(type) && tester.canPlayType(type) !== ''
        ) ||
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type))
      if (!mimeType) {
        URL.revokeObjectURL(videoUrl)
        toast({
          title: 'Format audio non supporté',
          description: 'Essayez avec un fichier audio directement.',
          variant: 'destructive',
        })
        return
      }

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(destination.stream, { mimeType })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      const audioBlobPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          if (chunks.length === 0) {
            reject(new Error('No audio data'))
          } else {
            resolve(new Blob(chunks, { type: mimeType }))
          }
        }
        recorder.onerror = () => reject(new Error('Recorder error'))
      })

      toast({
        title: 'Extraction en cours',
        description: 'Merci de patienter...',
      })

      recorder.start()
      try {
        await videoEl.play()
      } catch {
        // ignore autoplay restrictions
      }

      videoEl.onended = () => {
        if (recorder.state !== 'inactive') recorder.stop()
      }

      let audioBlob: Blob
      try {
        audioBlob = await audioBlobPromise
      } catch (error) {
        URL.revokeObjectURL(videoUrl)
        toast({
          title: 'Extraction échouée',
          description: 'Impossible de récupérer le son de cette vidéo.',
          variant: 'destructive',
        })
        return
      }

      URL.revokeObjectURL(videoUrl)
      source.disconnect()

      if (selectedSoundSource === 'device' && selectedSoundUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(selectedSoundUrl)
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      setSelectedSoundUrl(audioUrl)
      setSelectedSoundTitle(`${file.name} (audio)`)
      setSelectedSoundSource('device')
      setSoundUrlInput('')
      toast({
        title: 'Son extrait',
        description: 'Vous pouvez maintenant choisir un extrait.',
      })
    },
    [ensureAudioContext, selectedSoundSource, selectedSoundUrl, toast]
  )

  const getCameraPermission = useCallback(async () => {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }

        const activeCamera = cameras[activeCameraIndex]
        const deviceId = activeCamera?.deviceId

        const buildVideoConstraints = (quality: CameraQuality) => ({
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: qualityPresets[quality].width },
          height: { ideal: qualityPresets[quality].height },
          frameRate: { ideal: 30, max: 60 },
        })

        const qualityOrder: CameraQuality[] =
          recordQuality === '8k' ? ['8k', '4k', 'hd'] : recordQuality === '4k' ? ['4k', 'hd'] : ['hd']

        let newStream: MediaStream | null = null
        let selectedQuality: CameraQuality = recordQuality
        let lastError: unknown = null

        for (const quality of qualityOrder) {
          try {
            newStream = await navigator.mediaDevices.getUserMedia({
              video: buildVideoConstraints(quality),
              audio: true,
            })
            selectedQuality = quality
            break
          } catch (error) {
            lastError = error
          }
        }

        if (!newStream) {
          throw lastError
        }

        if (selectedQuality !== recordQuality) {
          setRecordQuality(selectedQuality)
          toast({
            title: 'Qualite ajustee',
            description: `${qualityPresets[recordQuality].label} non supportee, passage a ${qualityPresets[selectedQuality].label}.`,
          })
        }
        
        const videoTrack = newStream.getVideoTracks()[0]
        if (videoTrack) {
          const settings = videoTrack.getSettings()
          const capabilities = videoTrack.getCapabilities()
          // @ts-ignore
          setHasFlash(!!capabilities.torch)

          const label = (activeCamera?.label || videoTrack.label || '').toLowerCase()
          const facing = (settings.facingMode || '').toString().toLowerCase()
          let front: boolean | null = null
          if (facing) {
            front = facing === 'user' || facing === 'front'
          }
          if (front === null && label) {
            if (label.includes('front') || label.includes('user') || label.includes('face')) {
              front = true
            } else if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
              front = false
            }
          }
          if (front === null && frontCameraIndex !== null) {
            front = activeCameraIndex === frontCameraIndex
          }
          if (front === null && cameras.length > 1) {
            front = activeCameraIndex === cameras.length - 1
          }
          setIsFrontCamera(Boolean(front))
        } else {
          setHasFlash(false)
          setIsFrontCamera(false)
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
  }, [activeCameraIndex, cameras, frontCameraIndex, recordQuality, stream, toast])

  useEffect(() => {
    const enumerateDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter(device => device.kind === 'videoinput')
            setCameras(videoDevices)
            const frontIndexByLabel = videoDevices.findIndex(d =>
              d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('user')
            )
            if (frontIndexByLabel !== -1) {
              setFrontCameraIndex(frontIndexByLabel)
              setActiveCameraIndex(frontIndexByLabel)
            } else if (videoDevices.length > 1) {
              const inferredFrontIndex = videoDevices.length - 1
              setFrontCameraIndex(inferredFrontIndex)
              setActiveCameraIndex(inferredFrontIndex)
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
  }, [activeCameraIndex, recordQuality, step])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const applyFilter = () => {
      video.style.filter = combinedFilter
      // @ts-ignore
      video.style.webkitFilter = combinedFilter
    }
    applyFilter()
    const interval = window.setInterval(() => {
      if (video.style.filter !== combinedFilter) {
        applyFilter()
      }
    }, 800)
    return () => window.clearInterval(interval)
  }, [combinedFilter])

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
  
  const handleStartRecording = async () => {
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
        
        if (selectedSoundUrl) {
          try {
            await ensureAudioContext()
            await setupAudioGraph()
          } catch {
            // ignore
          }
        }

        const recordingStream = new MediaStream()
        stream.getVideoTracks().forEach((track) => recordingStream.addTrack(track))

        const mixedAudioTrack = mixedStreamRef.current?.getAudioTracks()?.[0]
        const micTrack = stream.getAudioTracks()?.[0]
        const audioFromElement =
          audioRef.current && typeof audioRef.current.captureStream === 'function'
            ? audioRef.current.captureStream().getAudioTracks()?.[0]
            : undefined

        const preferSound = Boolean(selectedSoundUrl)
        const pickedAudioTrack =
          mixedAudioTrack ||
          (preferSound ? audioFromElement : undefined) ||
          micTrack ||
          audioFromElement

        if (pickedAudioTrack) {
          recordingStream.addTrack(pickedAudioTrack)
        }

        mediaRecorderRef.current = new MediaRecorder(recordingStream, { mimeType: options })
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
        if (selectedSoundUrl && audioRef.current) {
          ensureAudioContext()
            .then(() => {
              stopSoundPlayback()
              const start = Math.max(0, Math.min(soundTrimStart, Math.max(0, soundDuration - 0.1)))
              const length = Math.max(1, Math.min(soundTrimLength, soundDuration || soundTrimLength))
              audioRef.current!.currentTime = start
              audioRef.current!.play().catch(() => {
                // ignore autoplay restrictions
              })
              setIsSoundPlaying(true)
              if (soundStopTimeoutRef.current) {
                clearTimeout(soundStopTimeoutRef.current)
              }
              soundStopTimeoutRef.current = setTimeout(() => {
                stopSoundPlayback()
              }, length * 1000)
            })
            .catch(() => {
              // ignore
            })
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
        song: selectedSoundTitle || 'Son original',
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
    } else if (id === 'sound') {
        setShowSoundPicker(true)
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

      {showSoundPicker && (
        <div
          className="absolute inset-0 z-40 flex items-end bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSoundPicker(false)}
        >
          <div
            className="w-full rounded-t-3xl bg-background p-5 text-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Son</p>
                <h3 className="text-lg font-semibold">Ajouter un son</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setShowSoundPicker(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-sm font-semibold">Catalogue interne</p>
                <div className="grid grid-cols-1 gap-2">
                  {internalSounds.map((sound) => (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => handleInternalSound(sound)}
                      className={cn(
                        'flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-left transition-colors',
                        selectedSoundUrl === sound.url
                          ? 'bg-primary/20 text-primary'
                          : 'bg-black/30 text-white hover:bg-white/10'
                      )}
                    >
                      <span className="text-sm font-medium">{sound.title}</span>
                      <span className="text-xs text-muted-foreground">Choisir</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sons locaux du projet (fonctionnent hors ligne).
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-sm font-semibold">Recherche Pixabay Music</p>
                <div className="flex gap-2">
                  <Input
                    value={soundQuery}
                    onChange={(e) => setSoundQuery(e.target.value)}
                    placeholder="Rechercher un son"
                  />
                  <Button onClick={openSoundPlatform}>Rechercher</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Téléchargez un son puis importez-le depuis l'appareil ou une URL directe.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-sm font-semibold">Importer depuis l&apos;appareil</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      if (file.type.startsWith('video/')) {
                        extractAudioFromVideo(file)
                      } else {
                        handleSoundFile(file)
                      }
                    }
                    event.currentTarget.value = ''
                  }}
                />
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
                  Choisir un fichier audio ou vidéo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Les vidéos seront importées et le son sera extrait automatiquement.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-sm font-semibold">Importer via URL audio</p>
                <div className="flex gap-2">
                  <Input
                    value={soundUrlInput}
                    onChange={(e) => setSoundUrlInput(e.target.value)}
                    placeholder="https://exemple.com/son.mp3"
                  />
                  <Button onClick={handleSoundUrl}>Utiliser</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  L&apos;URL doit pointer vers un fichier audio avec CORS autorise.
                </p>
              </div>

              {selectedSoundUrl && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{selectedSoundTitle || 'Son sélectionné'}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSoundSource === 'device' ? 'Fichier local' : 'URL audio'}
                      </p>
                    </div>
                    <Button variant="ghost" onClick={clearSoundSelection}>
                      Supprimer
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (isSoundPlaying) {
                          stopSoundPlayback()
                        } else {
                          playSoundFromTrim()
                        }
                      }}
                      disabled={!isSoundReady}
                    >
                      {isSoundPlaying ? 'Pause' : 'Ecouter'}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {isSoundReady ? 'Pret' : 'Chargement...'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Debut extrait</span>
                      <span>{soundTrimStart.toFixed(1)}s</span>
                    </div>
                    <Slider
                      value={[soundTrimStart]}
                      max={Math.max(0, soundDuration - soundTrimLength)}
                      step={0.1}
                      onValueChange={(value) => {
                        const next = value[0]
                        setSoundTrimStart(Math.max(0, Math.min(next, Math.max(0, soundDuration - soundTrimLength))))
                      }}
                      disabled={!isSoundReady}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Duree extrait</span>
                      <span>{soundTrimLength.toFixed(1)}s</span>
                    </div>
                    <Slider
                      value={[soundTrimLength]}
                      min={3}
                      max={Math.min(20, Math.max(3, soundDuration || 20))}
                      step={0.5}
                      onValueChange={(value) => {
                        const next = value[0]
                        const maxLength = Math.min(20, soundDuration || next)
                        const clamped = Math.max(3, Math.min(next, maxLength))
                        setSoundTrimLength(clamped)
                        if (soundTrimStart + clamped > soundDuration) {
                          setSoundTrimStart(Math.max(0, soundDuration - clamped))
                        }
                      }}
                      disabled={!isSoundReady}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Volume musique</span>
                      <span>{Math.round(soundVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[soundVolume * 100]}
                      max={100}
                      step={1}
                      onValueChange={(value) => setSoundVolume(value[0] / 100)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Volume micro</span>
                      <span>{Math.round(micVolume * 100)}%</span>
                    </div>
                    <Slider
                      value={[micVolume * 100]}
                      max={100}
                      step={1}
                      onValueChange={(value) => setMicVolume(value[0] / 100)}
                    />
                  </div>

                  <Button className="w-full" onClick={() => setShowSoundPicker(false)}>
                    Utiliser ce son
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'recording' && (
        <div className="absolute top-[calc(4.5rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 p-1 shadow-lg shadow-black/40 backdrop-blur-md">
            {(Object.keys(qualityPresets) as CameraQuality[]).map((quality) => (
              <button
                key={quality}
                type="button"
                onClick={() => setRecordQuality(quality)}
                disabled={isRecording}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  recordQuality === quality
                    ? 'bg-primary text-primary-foreground'
                    : 'text-white/80 hover:bg-white/10 hover:text-white',
                  isRecording && 'opacity-50 cursor-not-allowed'
                )}
              >
                {qualityPresets[quality].label}
              </button>
            ))}
          </div>
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
          style={{
            filter: combinedFilter,
            // @ts-ignore
            WebkitFilter: combinedFilter,
            transform: isFrontCamera ? 'scaleX(-1)' : 'none',
          }}
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

      <audio ref={audioRef} className="hidden" preload="auto" crossOrigin="anonymous" />
    </div>
  )
}
