'use client'

import { useMemo, useRef, useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Camera, CheckCircle2, FileBadge, Loader2, ScanLine, Upload } from 'lucide-react'
import { useDoc, useFirestore, useUser } from '@/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinary'
import type { User } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

type KycDraft = {
  status?: 'draft' | 'pending' | 'approved' | 'rejected'
  selfieVideoUrl?: string
  selfiePublicId?: string
  documentUrl?: string
  documentPublicId?: string
  documentType?: string
}

export function CreatorKycCard({ profile }: { profile: User }) {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [recording, setRecording] = useState(false)
  const [recordingStep, setRecordingStep] = useState('Face')
  const [uploadingSelfie, setUploadingSelfie] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [documentType, setDocumentType] = useState('Carte d’identité')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const kycRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'creatorKyc', user.uid)
  }, [firestore, user])
  const { data: kyc } = useDoc<KycDraft>(kycRef as any)

  const status = kyc?.status || profile.kycStatus || 'not_started'
  const canSubmit = Boolean(kyc?.selfieVideoUrl && kyc?.documentUrl && status !== 'approved' && status !== 'pending')

  const saveDraft = async (data: Partial<KycDraft>) => {
    if (!firestore || !user || !kycRef) return
    await setDoc(
      kycRef,
      {
        userId: user.uid,
        status: 'draft',
        updatedAt: serverTimestamp(),
        ...data,
      },
      { merge: true }
    )
    await setDoc(doc(firestore, 'users', user.uid), { kycStatus: 'draft' }, { merge: true })
  }

  const startSelfie = async () => {
    if (!firestore || !user) return
    let mediaStream: MediaStream | null = null
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play().catch(() => undefined)
      }

      chunksRef.current = []
      const recorder = new MediaRecorder(mediaStream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        mediaStream?.getTracks().forEach((track) => track.stop())
        setStream(null)
        setRecording(false)
        setUploadingSelfie(true)
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' })
          const upload = await uploadVideoToCloudinary(blob, undefined, 'creator-kyc-selfies')
          await saveDraft({
            selfieVideoUrl: upload.secure_url,
            selfiePublicId: upload.public_id,
          })
          toast({ title: 'Vidéo selfie enregistrée' })
        } catch (error: any) {
          toast({
            title: 'Upload selfie échoué',
            description: error?.message || 'Veuillez réessayer.',
            variant: 'destructive',
          })
        } finally {
          setUploadingSelfie(false)
        }
      }

      setRecording(true)
      setRecordingStep('Face')
      recorder.start()
      window.setTimeout(() => setRecordingStep('Tournez la tête à gauche'), 3000)
      window.setTimeout(() => setRecordingStep('Tournez la tête à droite'), 6500)
      window.setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), 10000)
    } catch (error: any) {
      mediaStream?.getTracks().forEach((track) => track.stop())
      setStream(null)
      setRecording(false)
      toast({
        title: 'Caméra indisponible',
        description: error?.message || 'Autorisez la caméra pour continuer.',
        variant: 'destructive',
      })
      if (uploadingSelfie) {
        setUploadingSelfie(false)
      }
    }
  }

  const handleDocumentFile = async (file?: File) => {
    if (!file) return
    setUploadingDocument(true)
    try {
      const upload = await uploadImageToCloudinary(file)
      await saveDraft({
        documentUrl: upload.secure_url,
        documentPublicId: upload.public_id,
        documentType,
      })
      toast({ title: 'Pièce enregistrée' })
    } catch (error: any) {
      toast({
        title: 'Upload document échoué',
        description: error?.message || 'Veuillez réessayer.',
        variant: 'destructive',
      })
    } finally {
      setUploadingDocument(false)
    }
  }

  const submitKyc = async () => {
    if (!firestore || !user || !kycRef || !canSubmit) return
    setSubmitting(true)
    try {
      const currentSelfieUrl = kyc?.selfieVideoUrl
      const currentDocumentUrl = kyc?.documentUrl
      if (!currentSelfieUrl || !currentDocumentUrl) {
        toast({
          title: 'Dossier incomplet',
          description: 'La vidéo selfie et la pièce d’identité doivent être enregistrées avant la soumission.',
          variant: 'destructive',
        })
        return
      }
      await setDoc(
        kycRef,
        {
          selfieVideoUrl: currentSelfieUrl,
          documentUrl: currentDocumentUrl,
          status: 'pending',
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      await setDoc(doc(firestore, 'users', user.uid), { kycStatus: 'pending' }, { merge: true })
      toast({ title: 'Dossier soumis', description: 'Votre demande est en attente de validation.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'approved') {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="font-semibold">Identité approuvée</p>
            <p className="text-sm text-muted-foreground">Les retraits de fonds sont activés.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="text-lg">Confirmer mon identité pour commencer à gagner de l'argent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
          Statut: {status === 'pending' ? 'En attente de validation' : status === 'rejected' ? 'Refusé, à corriger' : 'Brouillon'}.
          Vous gardez un accès illimité à la plateforme pendant la vérification. Les retraits restent bloqués jusqu’à approbation.
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Étape 1 - Vidéo selfie 10 secondes</p>
              <p className="text-xs text-muted-foreground">Face 3s, tête à gauche, puis tête à droite.</p>
            </div>
            {kyc?.selfieVideoUrl && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="h-full w-full scale-x-[-1] object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 border-2 border-primary/50">
              <div className="absolute inset-x-6 top-1/2 h-px bg-primary/70 shadow-[0_0_18px_hsl(var(--primary))]" />
              <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60" />
              <ScanLine className="absolute left-1/2 top-6 h-6 w-6 -translate-x-1/2 text-primary animate-pulse" />
            </div>
            {recording && (
              <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-sm text-white">
                {recordingStep}
              </div>
            )}
          </div>
          <Button onClick={startSelfie} disabled={recording || uploadingSelfie || status === 'pending'} className="gap-2">
            {uploadingSelfie ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {uploadingSelfie ? 'Upload de la vidéo...' : kyc?.selfieVideoUrl ? 'Reprendre la vidéo selfie' : 'Démarrer la vidéo selfie'}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Étape 2 - Pièce d'identité</p>
              <p className="text-xs text-muted-foreground">Carte d’identité, passeport ou permis.</p>
            </div>
            {kyc?.documentUrl && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          </div>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            disabled={uploadingDocument || status === 'pending'}
          >
            <option>Carte d’identité</option>
            <option>Passeport</option>
            <option>Permis</option>
          </select>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/30 px-4 py-5 text-sm hover:bg-white/5">
            {uploadingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Capturer ou importer la pièce
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={uploadingDocument || status === 'pending'}
              onChange={(event) => handleDocumentFile(event.target.files?.[0])}
            />
          </label>
          {kyc?.documentUrl && (
            <a href={kyc.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary">
              <FileBadge className="h-4 w-4" />
              Document enregistré
            </a>
          )}
        </div>

        <Button className="w-full" onClick={submitKyc} disabled={!canSubmit || submitting || uploadingSelfie || uploadingDocument || status === 'pending'}>
          {submitting ? 'Chargement des données...' : status === 'pending' ? 'Dossier en attente' : 'Soumettre pour validation'}
        </Button>
      </CardContent>
    </Card>
  )
}
