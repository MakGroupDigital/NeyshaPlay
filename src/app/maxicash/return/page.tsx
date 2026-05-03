'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function MaxiCashReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Validation du depot Mobile Money...')

  useEffect(() => {
    const userId = searchParams.get('userId')
    const transactionId = searchParams.get('transactionId')
    const result = searchParams.get('result')

    if (!userId || !transactionId) {
      setStatus('error')
      setMessage('Parametres de depot manquants.')
      return
    }

    const finalize = async () => {
      try {
        const response = await fetch('/api/maxicash/deposit/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            transactionId,
            status: result === 'failed' ? 'failed' : 'completed',
            providerPayload: Object.fromEntries(searchParams.entries()),
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Validation Mobile Money impossible')
        }
        setStatus(data.transactionStatus === 'completed' ? 'success' : 'error')
        setMessage(
          data.transactionStatus === 'completed'
            ? 'Depot confirme. Votre portefeuille a ete credite.'
            : 'Le depot n a pas ete confirme.'
        )
      } catch (error: any) {
        setStatus('error')
        setMessage(error?.message || 'Echec de la validation Mobile Money.')
      }
    }

    finalize()
  }, [searchParams])

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1 className="text-2xl font-bold font-headline">
          {status === 'loading' ? 'Depot en cours...' : status === 'success' ? 'Depot reussi' : 'Depot echoue'}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button className="w-full" onClick={() => router.push('/wallet')}>
          Retour au portefeuille
        </Button>
      </div>
    </div>
  )
}
