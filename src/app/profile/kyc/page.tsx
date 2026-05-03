'use client'

import { useEffect, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { doc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CreatorKycCard } from '@/components/creator-kyc-card'
import { useDoc, useFirestore, useUser } from '@/firebase'
import type { User } from '@/lib/types'

export default function CreatorKycPage() {
  const router = useRouter()
  const firestore = useFirestore()
  const { user, loading } = useUser()

  const userDocRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])

  const { data: profile, loading: profileLoading } = useDoc<User>(userDocRef as any)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, router, user])

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!profile) return null

  if (profile.role !== 'creator') {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <p className="text-muted-foreground">Cette vérification est réservée aux comptes créateurs.</p>
        <Button className="mt-4" onClick={() => router.push('/profile')}>
          Retour au profil
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push('/profile')}>
        <ArrowLeft className="h-4 w-4" />
        Profil
      </Button>
      <CreatorKycCard profile={profile} />
    </div>
  )
}
