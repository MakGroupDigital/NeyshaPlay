'use client'

import { useMemo } from 'react'
import { doc } from 'firebase/firestore'
import { usePathname, useRouter } from 'next/navigation'
import { Wrench } from 'lucide-react'
import { useDoc, useFirestore, useUser } from '@/firebase'
import type { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { isAdminRole } from '@/lib/roles'

type GlobalConfig = {
  maintenanceMode?: boolean
  supportMessage?: string
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore()
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const configRef = useMemo(() => {
    if (!firestore) return null
    return doc(firestore, 'appConfig', 'global')
  }, [firestore])

  const userRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])

  const { data: config } = useDoc<GlobalConfig>(configRef as any)
  const { data: profile } = useDoc<User>(userRef as any)

  if (pathname?.startsWith('/login')) return <>{children}</>
  if (!loading && isAdminRole(profile?.role)) return <>{children}</>

  if (profile?.status === 'banned') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
            <Wrench className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">Compte suspendu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre accès à NeyshaPlay a été suspendu par la modération.
          </p>
        </div>
      </div>
    )
  }

  if (!config?.maintenanceMode) return <>{children}</>

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Maintenance en cours</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {config.supportMessage || 'NeyshaPlay est temporairement en maintenance. Veuillez revenir dans quelques instants.'}
        </p>
        {!user && (
          <Button className="mt-5" onClick={() => router.push('/login')}>
            Connexion admin
          </Button>
        )}
      </div>
    </div>
  )
}
