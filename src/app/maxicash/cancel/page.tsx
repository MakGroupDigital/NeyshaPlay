'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function MaxiCashCancelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const userId = searchParams.get('userId')
    const transactionId = searchParams.get('transactionId')
    if (!userId || !transactionId) return

    fetch('/api/maxicash/deposit/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        transactionId,
        status: 'cancelled',
        providerPayload: Object.fromEntries(searchParams.entries()),
      }),
    }).catch(() => undefined)
  }, [searchParams])

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold font-headline">Depot annule</h1>
        <p className="text-sm text-muted-foreground">
          Le depot Mobile Money a ete annule. Vous pouvez reessayer depuis le portefeuille.
        </p>
        <Button className="w-full" onClick={() => router.push('/wallet')}>
          Retour au portefeuille
        </Button>
      </div>
    </div>
  )
}
