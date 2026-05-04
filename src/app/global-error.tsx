'use client'

import './globals.css'
import { useEffect } from 'react'
import { AppErrorState } from '@/components/app-error-state'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global application error:', error)
  }, [error])

  return (
    <html lang="fr" className="dark h-full bg-background">
      <body className="font-body antialiased min-h-[100dvh] bg-background text-foreground">
        <AppErrorState
          code="Erreur critique"
          title="L’application a rencontré un problème"
          description="Une erreur globale empêche l’affichage normal de NeyshaPlay. Réessayez, actualisez la page ou vérifiez votre connexion."
          error={error}
          reset={reset}
        />
      </body>
    </html>
  )
}
