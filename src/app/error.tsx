'use client'

import { useEffect } from 'react'
import { AppErrorState } from '@/components/app-error-state'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <AppErrorState
      code="Erreur"
      title="Une erreur est survenue"
      description="L’application n’a pas pu terminer cette action. Vous pouvez réessayer, actualiser la page, revenir en arrière ou vérifier votre connexion."
      error={error}
      reset={reset}
    />
  )
}
