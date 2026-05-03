'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaypalDepositCancelPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold font-headline">Depot annule</h1>
        <p className="text-sm text-muted-foreground">
          Le depot PayPal a ete annule. Vous pouvez continuer ou reessayer depuis le portefeuille.
        </p>
        <Button className="w-full" onClick={() => router.push('/wallet')}>
          Retour au portefeuille
        </Button>
      </div>
    </div>
  )
}
