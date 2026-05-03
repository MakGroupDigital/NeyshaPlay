'use client'

import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ClientFormattedNumber } from '@/components/client-formatted-number'
import { useDoc, useUser } from '@/firebase'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFirestore } from '@/firebase/provider'
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import type { User, Video } from '@/lib/types'
import { Settings, UserPlus, Users, Heart, X, Play, Pause, Volume2, VolumeX, Share2, Copy, QrCode, MoreVertical, Trash2, Edit, Camera, Loader2, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadImageToCloudinary } from '@/lib/cloudinary'

const countriesByRegion = [
  {
    label: 'RDC',
    countries: ['République démocratique du Congo'],
  },
  {
    label: 'Afrique',
    countries: [
      'Afrique du Sud',
      'Algérie',
      'Angola',
      'Bénin',
      'Botswana',
      'Burkina Faso',
      'Burundi',
      'Cameroun',
      'Cap-Vert',
      'Centrafrique',
      'Comores',
      'Congo-Brazzaville',
      "Côte d'Ivoire",
      'Djibouti',
      'Égypte',
      'Érythrée',
      'Éthiopie',
      'Gabon',
      'Gambie',
      'Ghana',
      'Guinée',
      'Guinée-Bissau',
      'Guinée équatoriale',
      'Kenya',
      'Lesotho',
      'Liberia',
      'Libye',
      'Madagascar',
      'Malawi',
      'Mali',
      'Maroc',
      'Maurice',
      'Mauritanie',
      'Mozambique',
      'Namibie',
      'Niger',
      'Nigeria',
      'Ouganda',
      'Rwanda',
      'Sao Tomé-et-Principe',
      'Sénégal',
      'Seychelles',
      'Sierra Leone',
      'Somalie',
      'Soudan',
      'Soudan du Sud',
      'Tanzanie',
      'Tchad',
      'Togo',
      'Tunisie',
      'Zambie',
      'Zimbabwe',
    ],
  },
  {
    label: 'Europe',
    countries: [
      'Allemagne',
      'Belgique',
      'Espagne',
      'France',
      'Italie',
      'Luxembourg',
      'Pays-Bas',
      'Portugal',
      'Royaume-Uni',
      'Suisse',
    ],
  },
  {
    label: 'Amérique',
    countries: ['Brésil', 'Canada', 'États-Unis', 'Mexique'],
  },
]

const cityOptionsByCountry: Record<string, string[]> = {
  'République démocratique du Congo': ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Kisangani', 'Mbuji-Mayi', 'Kananga', 'Matadi', 'Kolwezi'],
  Angola: ['Luanda', 'Benguela', 'Lubango', 'Huambo'],
  Cameroun: ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua'],
  "Côte d'Ivoire": ['Abidjan', 'Yamoussoukro', 'Bouaké', 'San Pedro'],
  Ghana: ['Accra', 'Kumasi', 'Tamale', 'Tema'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  Maroc: ['Casablanca', 'Rabat', 'Marrakech', 'Fès'],
  Nigeria: ['Lagos', 'Abuja', 'Kano', 'Ibadan'],
  Rwanda: ['Kigali', 'Butare', 'Gisenyi'],
  Sénégal: ['Dakar', 'Thiès', 'Saint-Louis'],
  'Afrique du Sud': ['Johannesburg', 'Le Cap', 'Durban', 'Pretoria'],
  France: ['Paris', 'Lyon', 'Marseille', 'Lille'],
  Belgique: ['Bruxelles', 'Anvers', 'Liège', 'Charleroi'],
  Allemagne: ['Berlin', 'Hambourg', 'Munich', 'Cologne'],
  Espagne: ['Madrid', 'Barcelone', 'Valence', 'Séville'],
  Italie: ['Rome', 'Milan', 'Naples', 'Turin'],
  Canada: ['Montréal', 'Toronto', 'Ottawa', 'Vancouver'],
  'États-Unis': ['New York', 'Washington', 'Los Angeles', 'Atlanta'],
  Brésil: ['São Paulo', 'Rio de Janeiro', 'Brasília'],
  Mexique: ['Mexico', 'Guadalajara', 'Monterrey'],
}

const getCitiesForCountry = (country: string) => cityOptionsByCountry[country] || ['Capitale', 'Ville principale', 'Autre']

const calculateAge = (birthDate: string) => {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}
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
import { Checkbox } from '@/components/ui/checkbox'

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
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false)
  const [editProfileName, setEditProfileName] = useState('')
  const [editProfileUsername, setEditProfileUsername] = useState('')
  const [editProfileGender, setEditProfileGender] = useState<'female' | 'male' | ''>('')
  const [editProfileCountry, setEditProfileCountry] = useState('')
  const [editProfileCity, setEditProfileCity] = useState('')
  const [editProfileBirthDate, setEditProfileBirthDate] = useState('')
  const [editProfileAvatarFile, setEditProfileAvatarFile] = useState<File | null>(null)
  const [editProfileAvatarPreview, setEditProfileAvatarPreview] = useState('')
  const [avatarCropX, setAvatarCropX] = useState(50)
  const [avatarCropY, setAvatarCropY] = useState(50)
  const [avatarZoom, setAvatarZoom] = useState(1)
  const [avatarRotation, setAvatarRotation] = useState(0)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0)
  const [usernameEditedManually, setUsernameEditedManually] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [showCreatorDialog, setShowCreatorDialog] = useState(false)
  const [acceptPolicy, setAcceptPolicy] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const cropGestureRef = useRef<{
    pointers: Map<number, { x: number; y: number }>
    startX: number
    startY: number
    startZoom: number
    startRotation: number
    startDistance: number
    startAngle: number
  }>({
    pointers: new Map(),
    startX: 50,
    startY: 50,
    startZoom: 1,
    startRotation: 0,
    startDistance: 0,
    startAngle: 0,
  })

  const kycDocRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'creatorKyc', user.uid)
  }, [firestore, user])
  const { data: kycData } = useDoc<{ status?: User['kycStatus'] }>(kycDocRef as any)
  const kycStatus = kycData?.status || userData?.kycStatus || 'not_started'
  const kycButtonLabel =
    kycStatus === 'approved'
      ? 'Identité approuvée'
      : kycStatus === 'pending'
        ? 'Identité en attente'
        : kycStatus === 'rejected'
          ? 'Identité refusée'
          : kycStatus === 'draft'
            ? 'Continuer la vérification'
            : 'Confirmer mon identité'

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

  const openEditProfile = () => {
    setEditProfileName(userData.name || '')
    setEditProfileUsername((userData.username || '').replace(/^@/, ''))
    setEditProfileGender(userData.gender || '')
    setEditProfileCountry(userData.country || '')
    setEditProfileCity(userData.city || '')
    setEditProfileBirthDate(userData.birthDate || '')
    setUsernameEditedManually(false)
    setEditProfileAvatarFile(null)
    setEditProfileAvatarPreview(userData.avatarUrl || '')
    setAvatarCropX(50)
    setAvatarCropY(50)
    setAvatarZoom(1)
    setAvatarRotation(0)
    setAvatarUploadProgress(0)
    setShowEditProfileDialog(true)
  }

  const slugifyUsername = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._]+/g, '')
      .replace(/^[._]+|[._]+$/g, '')
      .slice(0, 24)

  const handleProfileNameChange = (value: string) => {
    setEditProfileName(value)
    if (!usernameEditedManually) {
      setEditProfileUsername(slugifyUsername(value))
    }
  }

  const isUsernameAvailable = async (username: string) => {
    if (!firestore || !user) return false
    if (username === userData?.username) return true

    const usernameQuery = query(
      collection(firestore, 'users'),
      where('username', '==', username)
    )
    const snapshot = await getDocs(usernameQuery)
    return snapshot.docs.every((docSnap) => docSnap.id === user.uid)
  }

  const handleAvatarFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Fichier invalide',
        description: 'Choisissez une image pour la photo de profil.',
        variant: 'destructive',
      })
      return
    }
    if (editProfileAvatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editProfileAvatarPreview)
    }
    setEditProfileAvatarFile(file)
    setEditProfileAvatarPreview(URL.createObjectURL(file))
    setAvatarCropX(50)
    setAvatarCropY(50)
    setAvatarZoom(1)
    setAvatarRotation(0)
  }

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

  const getPointerDistance = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return 0
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  const getPointerAngle = (points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return 0
    return Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * (180 / Math.PI)
  }

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    cropGestureRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = Array.from(cropGestureRef.current.pointers.values())
    cropGestureRef.current.startX = avatarCropX
    cropGestureRef.current.startY = avatarCropY
    cropGestureRef.current.startZoom = avatarZoom
    cropGestureRef.current.startRotation = avatarRotation
    cropGestureRef.current.startDistance = getPointerDistance(points)
    cropGestureRef.current.startAngle = getPointerAngle(points)
  }

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropGestureRef.current.pointers.has(event.pointerId)) return
    cropGestureRef.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = Array.from(cropGestureRef.current.pointers.values())

    if (points.length >= 2) {
      const distance = getPointerDistance(points)
      const angle = getPointerAngle(points)
      if (cropGestureRef.current.startDistance > 0) {
        setAvatarZoom(clamp(cropGestureRef.current.startZoom * (distance / cropGestureRef.current.startDistance), 1, 3))
      }
      setAvatarRotation(cropGestureRef.current.startRotation + (angle - cropGestureRef.current.startAngle))
      return
    }

    const start = points[0]
    const previous = cropGestureRef.current.pointers.get(event.pointerId)
    if (!start || !previous) return
    const deltaX = event.movementX || 0
    const deltaY = event.movementY || 0
    setAvatarCropX((value) => clamp(value - deltaX / 2, 0, 100))
    setAvatarCropY((value) => clamp(value - deltaY / 2, 0, 100))
  }

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    cropGestureRef.current.pointers.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleCropWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setAvatarZoom((value) => clamp(value + (event.deltaY > 0 ? -0.08 : 0.08), 1, 3))
  }

  const buildCroppedAvatarBlob = async (): Promise<Blob> => {
    if (!editProfileAvatarFile) {
      throw new Error('Aucune image selectionnee')
    }
    if (!editProfileAvatarPreview) return editProfileAvatarFile

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = editProfileAvatarPreview
    })

    const size = 720
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return editProfileAvatarFile

    const scale = Math.max(size / image.width, size / image.height) * avatarZoom
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    const minX = size - drawWidth
    const minY = size - drawHeight
    const x = minX * (avatarCropX / 100)
    const y = minY * (avatarCropY / 100)

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    ctx.translate(size / 2, size / 2)
    ctx.rotate((avatarRotation * Math.PI) / 180)
    ctx.translate(-size / 2, -size / 2)
    ctx.drawImage(image, x, y, drawWidth, drawHeight)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    )
    return blob || editProfileAvatarFile
  }

  const handleSaveProfile = async () => {
    if (!firestore || !user || !userData) return
    const name = editProfileName.trim()
    const usernameBase = editProfileUsername.trim().replace(/^@/, '').replace(/\s+/g, '')

    if (!name || !usernameBase || !editProfileGender || !editProfileCountry || !editProfileCity || !editProfileBirthDate) {
      toast({
        title: 'Champs requis',
        description: 'Remplissez le nom, nom utilisateur, sexe, pays, ville et date de naissance.',
        variant: 'destructive',
      })
      return
    }

    if (usernameBase.length < 3) {
      toast({
        title: 'Nom utilisateur trop court',
        description: 'Choisissez au moins 3 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingProfile(true)
    setAvatarUploadProgress(0)
    try {
      let avatarUrl = userData.avatarUrl || ''
      if (editProfileAvatarFile) {
        const croppedAvatar = await buildCroppedAvatarBlob()
        const upload = await uploadImageToCloudinary(croppedAvatar, setAvatarUploadProgress)
        avatarUrl = upload.secure_url
      }

      const username = `@${usernameBase}`
      const available = await isUsernameAvailable(username)
      if (!available) {
        toast({
          title: 'Nom utilisateur indisponible',
          description: 'Ce nom utilisateur est deja utilise. Essayez une autre variante.',
          variant: 'destructive',
        })
        return
      }

      const userDocRef = doc(firestore, 'users', user.uid)
      const profileUpdate = {
        name,
        username,
        avatarUrl,
        gender: editProfileGender,
        country: editProfileCountry,
        city: editProfileCity,
        birthDate: editProfileBirthDate,
        updatedAt: new Date(),
      }

      await updateDoc(userDocRef, profileUpdate)
      await updateProfile(user, {
        displayName: name,
        photoURL: avatarUrl,
      })

      const publicUserSnapshot = {
        id: user.uid,
        name,
        username,
        avatarUrl,
        following: userData.following || 0,
        followers: userData.followers || 0,
        likes: userData.likes || 0,
        bio: userData.bio || '',
        role: userData.role,
        email: userData.email || user.email || '',
        createdAt: userData.createdAt,
        gender: editProfileGender,
        feedGender: userData.feedGender || 'all',
        country: editProfileCountry,
        city: editProfileCity,
        birthDate: editProfileBirthDate,
      }

      const videosSnapshot = await getDocs(query(collection(firestore, 'videos'), where('userRef', '==', userDocRef)))
      const videoDocs = videosSnapshot.docs
      for (let i = 0; i < videoDocs.length; i += 450) {
        const batch = writeBatch(firestore)
        videoDocs.slice(i, i + 450).forEach((videoDoc) => {
          batch.update(videoDoc.ref, {
            user: publicUserSnapshot,
            creatorGender: editProfileGender,
            updatedAt: new Date(),
          })
        })
        await batch.commit()
      }

      setUserData((prev) =>
        prev
          ? {
              ...prev,
              name,
              username,
              avatarUrl,
              gender: editProfileGender,
              country: editProfileCountry,
              city: editProfileCity,
              birthDate: editProfileBirthDate,
            }
          : prev
      )
      setUserVideos((prev) =>
        prev.map((video) => ({
          ...video,
          user: {
            ...video.user,
            ...publicUserSnapshot,
          } as User,
          creatorGender: editProfileGender,
        }))
      )
      setShowEditProfileDialog(false)
      setEditProfileAvatarFile(null)
      toast({ title: 'Profil mis a jour' })
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de mettre a jour le profil.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
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

  const handleBecomeCreator = async () => {
    if (!firestore || !user || !acceptPolicy) return
    try {
      const userRef = doc(firestore, 'users', user.uid)
      await updateDoc(userRef, { role: 'creator', updatedAt: new Date() })
      setUserData((prev) => (prev ? { ...prev, role: 'creator' } : prev))
      toast({
        title: 'Bienvenue parmi les créateurs',
        description: 'Votre compte est maintenant configuré pour publier des vidéos.',
      })
      setShowCreatorDialog(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de mettre à jour le rôle. Réessayez.',
      })
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
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {userData.gender && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {userData.gender === 'female' ? 'Femme' : 'Homme'}
              </span>
            )}
            {userData.birthDate && calculateAge(userData.birthDate) !== null && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {calculateAge(userData.birthDate)} ans
              </span>
            )}
            {userData.country && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                {userData.city ? `${userData.city}, ${userData.country}` : userData.country}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button variant="secondary" onClick={openEditProfile}>Modifier le profil</Button>
            {userData.role === 'creator' && (
              <Button variant="outline" onClick={() => router.push('/profile/kyc')}>
                {kycButtonLabel}
              </Button>
            )}
          </div>
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
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold font-headline">Vidéos</h2>
            <p className="text-sm text-muted-foreground">
              Total J'aime: <ClientFormattedNumber value={userData.likes || 0} />
            </p>
          </div>
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
                  <div className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] text-white">
                    <Eye className="h-3 w-3" />
                    <ClientFormattedNumber value={video.views || 0} />
                  </div>
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
          {userVideos.length === 0 && userData?.role === 'creator' && (
            <div className="py-10 text-center text-muted-foreground">
              Aucune vidéo publiée pour le moment.
            </div>
          )}
          {userVideos.length === 0 && userData?.role === 'user' && (
            <div className="py-8 space-y-4 text-center">
              <p className="text-lg font-semibold">Compte utilisateur</p>
              <p className="text-sm text-muted-foreground">
                Vous regardez du contenu en tant qu’utilisateur. Vous pouvez devenir créateur·trice et publier vos vidéos.
              </p>
              <Button onClick={() => { setShowCreatorDialog(true); setAcceptPolicy(false); }}>
                Devenir créateur·trice
              </Button>
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

      {/* Dialog modification profil */}
      <Dialog open={showEditProfileDialog} onOpenChange={(open) => !open && setShowEditProfileDialog(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>
              Mettez a jour votre nom, nom utilisateur et photo de profil.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(100dvh-12rem)] space-y-4 overflow-y-auto px-6 py-4">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                className="relative rounded-full"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isSavingProfile}
              >
                <Avatar className="h-28 w-28 border-4 border-primary">
                  <AvatarImage src={editProfileAvatarPreview} alt={editProfileName} />
                  <AvatarFallback className="text-3xl">{editProfileName.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/80 text-white">
                  <Camera className="h-4 w-4" />
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  handleAvatarFile(event.target.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isSavingProfile}
              >
                Changer la photo
              </Button>
              {editProfileAvatarFile && (
                <div className="w-full space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div
                    className="mx-auto h-48 w-48 touch-none select-none overflow-hidden rounded-full border border-white/10 bg-black"
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                    onWheel={handleCropWheel}
                  >
                    <img
                      src={editProfileAvatarPreview}
                      alt="Apercu recadrage"
                      draggable={false}
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition: `${avatarCropX}% ${avatarCropY}%`,
                        transform: `scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAvatarZoom((value) => clamp(value + 0.1, 1, 3))}
                      disabled={isSavingProfile}
                    >
                      Zoom +
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAvatarRotation((value) => value - 15)}
                      disabled={isSavingProfile}
                    >
                      Tourner
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setAvatarCropX(50)
                        setAvatarCropY(50)
                        setAvatarZoom(1)
                        setAvatarRotation(0)
                      }}
                      disabled={isSavingProfile}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              )}
              {isSavingProfile && editProfileAvatarFile && (
                <p className="text-xs text-muted-foreground">
                  Upload Cloudinary: {Math.round(avatarUploadProgress)}%
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={editProfileName}
                onChange={(e) => handleProfileNameChange(e.target.value)}
                placeholder="Votre nom"
                disabled={isSavingProfile}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom utilisateur</label>
              <div className="flex items-center rounded-md border border-input bg-background px-3">
                <span className="text-muted-foreground">@</span>
                <Input
                  value={editProfileUsername}
                  onChange={(e) => {
                    setUsernameEditedManually(true)
                    setEditProfileUsername(slugifyUsername(e.target.value))
                  }}
                  placeholder="username"
                  disabled={isSavingProfile}
                  className="border-0 px-1 focus-visible:ring-0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Propose automatiquement depuis votre nom. Chaque nom utilisateur doit etre unique.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sexe</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editProfileGender}
                  onChange={(e) => setEditProfileGender(e.target.value as 'female' | 'male' | '')}
                  disabled={isSavingProfile}
                >
                  <option value="">Choisir</option>
                  <option value="female">Femme</option>
                  <option value="male">Homme</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date de naissance</label>
                <Input
                  type="date"
                  value={editProfileBirthDate}
                  onChange={(e) => setEditProfileBirthDate(e.target.value)}
                  disabled={isSavingProfile}
                />
                {calculateAge(editProfileBirthDate) !== null && (
                  <p className="text-xs text-muted-foreground">
                    Age: {calculateAge(editProfileBirthDate)} ans
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pays</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editProfileCountry}
                  onChange={(e) => {
                    const nextCountry = e.target.value
                    setEditProfileCountry(nextCountry)
                    setEditProfileCity('')
                  }}
                  disabled={isSavingProfile}
                >
                  <option value="">Choisir un pays</option>
                  {countriesByRegion.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ville</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editProfileCity}
                  onChange={(e) => setEditProfileCity(e.target.value)}
                  disabled={isSavingProfile || !editProfileCountry}
                >
                  <option value="">Choisir une ville</option>
                  {editProfileCountry &&
                    getCitiesForCountry(editProfileCountry).map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-white/10 px-6 py-4">
            <Button variant="outline" onClick={() => setShowEditProfileDialog(false)} disabled={isSavingProfile}>
              Annuler
            </Button>
            <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
              {isSavingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Dialog devenir créateur */}
      <Dialog open={showCreatorDialog} onOpenChange={(open) => { setShowCreatorDialog(open); if (!open) setAcceptPolicy(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devenir créateur·trice</DialogTitle>
            <DialogDescription>
              Publiez vos vidéos, gagnez en visibilité et monétisez votre audience. Merci de lire et d’accepter notre politique des créateurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-muted-foreground">
            <p>En devenant créateur·trice, vous acceptez de :</p>
            <ul className="list-disc pl-5 space-y-1 text-left">
              <li>Respecter les règles de contenu (pas de contenu illicite, violent ou haineux).</li>
              <li>Détenir les droits sur les médias publiés.</li>
              <li>Accepter que les gains soient soumis à vérification et aux conditions locales.</li>
            </ul>
            <div className="flex items-start gap-2 pt-2">
              <Checkbox id="accept-policy" checked={acceptPolicy} onCheckedChange={(v) => setAcceptPolicy(Boolean(v))} />
              <label htmlFor="accept-policy" className="text-sm leading-tight text-foreground">
                J’ai lu et j’accepte la politique des créateurs.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreatorDialog(false); setAcceptPolicy(false); }}>
              Annuler
            </Button>
            <Button onClick={handleBecomeCreator} disabled={!acceptPolicy}>
              Valider et devenir créateur·trice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
