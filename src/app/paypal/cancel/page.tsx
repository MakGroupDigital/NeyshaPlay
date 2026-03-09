'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaypalCancelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const videoId = searchParams.get('videoId')

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold font-headline">Paiement annule</h1>
        <p className="text-sm text-muted-foreground">
          Le paiement PayPal a ete annule. Vous pouvez reessayer quand vous voulez.
        </p>
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => router.push('/')}>
            Retour au flux
          </Button>
          {videoId && (
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
              Reessayer l&apos;achat
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
