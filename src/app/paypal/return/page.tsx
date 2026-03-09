'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/firebase'
import { useFirestore } from '@/firebase/provider'
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { Button } from '@/components/ui/button'

export default function PaypalReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const firestore = useFirestore()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Validation du paiement...')

  useEffect(() => {
    const orderId = searchParams.get('token')
    const videoId = searchParams.get('videoId')

    if (!orderId || !videoId) {
      setStatus('error')
      setMessage('Paramètres de paiement manquants.')
      return
    }

    if (!user || !firestore) {
      setStatus('error')
      setMessage('Connexion requise pour finaliser le paiement.')
      return
    }

    const finalize = async () => {
      try {
        const captureRes = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const captureData = await captureRes.json()
        if (!captureRes.ok || captureData.status !== 'COMPLETED') {
          throw new Error('Capture PayPal échouée')
        }

        const videoRef = doc(firestore, 'videos', videoId)
        const videoSnap = await getDoc(videoRef)
        if (!videoSnap.exists()) {
          throw new Error('Vidéo introuvable')
        }

        const videoData = videoSnap.data() as any
        const price = Number(videoData.price || 0)
        const currency = videoData.currency || 'USD'

        const purchaseId = `${user.uid}_${videoId}`
        await setDoc(
          doc(firestore, 'purchases', purchaseId),
          {
            userId: user.uid,
            videoId,
            amount: price,
            currency,
            method: 'paypal',
            status: 'completed',
            createdAt: serverTimestamp(),
          },
          { merge: true }
        )

        const creatorId = (videoData.userRef as any)?.id || (videoData.userRef?.id ?? null)
        if (creatorId && creatorId !== user.uid) {
          const walletRef = doc(firestore, 'wallets', creatorId)
          const walletSnap = await getDoc(walletRef)
          if (walletSnap.exists()) {
            await updateDoc(walletRef, {
              balance: increment(price),
              currency,
              updatedAt: serverTimestamp(),
              userId: creatorId,
            })
          } else {
            await setDoc(walletRef, {
              userId: creatorId,
              balance: price,
              currency,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }
        }

        setStatus('success')
        setMessage('Paiement confirmé. Accès débloqué.')
      } catch (error) {
        console.error(error)
        setStatus('error')
        setMessage('Échec de la confirmation PayPal.')
      }
    }

    finalize()
  }, [searchParams, user, firestore])

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold font-headline">
          {status === 'loading' ? 'Paiement en cours...' : status === 'success' ? 'Paiement réussi' : 'Paiement échoué'}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button className="w-full" onClick={() => router.push('/')}>
          Retour au flux
        </Button>
      </div>
    </div>
  )
}
