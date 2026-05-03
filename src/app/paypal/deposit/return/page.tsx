'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PaypalDepositReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Validation du depot PayPal...')

  useEffect(() => {
    const userId = searchParams.get('userId')
    const orderId = searchParams.get('token')

    if (!userId || !orderId) {
      setStatus('error')
      setMessage('Parametres de depot manquants.')
      return
    }

    const finalize = async () => {
      try {
        const response = await fetch('/api/paypal/deposit/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, orderId }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error || 'Validation PayPal impossible')
        }

        setStatus('success')
        setMessage('Depot confirme. Votre portefeuille a ete credite.')
      } catch (error: any) {
        setStatus('error')
        setMessage(error?.message || 'Echec de la validation PayPal.')
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
