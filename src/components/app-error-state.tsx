'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Home, LifeBuoy, RefreshCcw, RotateCcw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AppErrorStateProps = {
  code?: string
  title: string
  description: string
  error?: Error & { digest?: string }
  reset?: () => void
  variant?: 'error' | 'not-found'
  className?: string
}

export function AppErrorState({
  code,
  title,
  description,
  error,
  reset,
  variant = 'error',
  className,
}: AppErrorStateProps) {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'online' | 'offline'>('idle')

  const canGoBack = typeof window !== 'undefined' && window.history.length > 1
  const technicalDetail = useMemo(() => {
    if (error?.digest) return `Référence: ${error.digest}`
    if (error?.message && process.env.NODE_ENV !== 'production') return error.message
    return null
  }, [error])

  const checkConnection = () => {
    const online = typeof navigator === 'undefined' ? true : navigator.onLine
    setConnectionStatus(online ? 'online' : 'offline')
  }

  const refresh = () => {
    window.location.reload()
  }

  const goBack = () => {
    if (canGoBack) {
      window.history.back()
      return
    }
    window.location.assign('/')
  }

  return (
    <main className={cn('flex min-h-[100dvh] items-center justify-center px-4 py-10', className)}>
      <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-background/95 p-5 text-center shadow-2xl shadow-black/30 sm:p-7">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          {variant === 'not-found' ? <LifeBuoy className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
        </div>

        {code && <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-primary">{code}</p>}
        <h1 className="mt-2 text-2xl font-bold font-headline sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>

        {technicalDetail && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-muted-foreground">
            {technicalDetail}
          </div>
        )}

        {connectionStatus !== 'idle' && (
          <div
            className={cn(
              'mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
              connectionStatus === 'online'
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {connectionStatus === 'online' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connectionStatus === 'online' ? 'Connexion active' : 'Connexion indisponible'}
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {reset && (
            <Button onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Réessayer
            </Button>
          )}
          <Button variant={reset ? 'secondary' : 'default'} onClick={refresh} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={goBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retourner
          </Button>
          <Button variant="outline" onClick={checkConnection} className="gap-2">
            <Wifi className="h-4 w-4" />
            Vérifier connexion
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Accueil
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/notifications">
              <LifeBuoy className="h-4 w-4" />
              Assistance
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
