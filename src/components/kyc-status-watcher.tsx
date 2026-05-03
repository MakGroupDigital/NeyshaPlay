'use client'

import { useEffect, useMemo } from 'react'
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useDoc, useFirestore, useUser } from '@/firebase'

type KycStatus = 'draft' | 'pending' | 'approved' | 'rejected'

type CreatorKyc = {
  status?: KycStatus
}

const statusContent: Record<KycStatus, string> = {
  draft: 'Votre dossier d’identité est en brouillon.',
  pending: 'Votre dossier d’identité est en attente de validation.',
  approved: 'Votre identité a été approuvée. Les retraits sont maintenant disponibles.',
  rejected: 'Votre dossier d’identité a été refusé. Veuillez le corriger et le soumettre à nouveau.',
}

export function KycStatusWatcher() {
  const firestore = useFirestore()
  const { user } = useUser()

  const kycRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'creatorKyc', user.uid)
  }, [firestore, user])

  const { data: kyc } = useDoc<CreatorKyc>(kycRef as any)

  useEffect(() => {
    if (!firestore || !user || !kyc?.status) return

    const status = kyc.status
    const storageKey = `kycStatusSeen:${user.uid}`
    const lastSeen = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
    if (lastSeen === status) return

    const syncStatus = async () => {
      await setDoc(doc(firestore, 'users', user.uid), { kycStatus: status }, { merge: true })

      if (status === 'approved' || status === 'rejected') {
        await addDoc(collection(firestore, 'notifications'), {
          recipientId: user.uid,
          actorId: 'system',
          actor: null,
          user: {
            name: 'NeyshaPlay',
            username: '@neyshaplay',
            avatarUrl: '',
          },
          type: 'comment',
          content: statusContent[status],
          read: false,
          metadata: { kycStatus: status },
          createdAt: serverTimestamp(),
        })
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, status)
      }
    }

    syncStatus().catch((error) => {
      console.warn('Unable to sync KYC status:', error)
    })
  }, [firestore, kyc?.status, user])

  return null
}
