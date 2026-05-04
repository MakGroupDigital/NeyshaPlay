import { AppErrorState } from '@/components/app-error-state'

export default function NotFound() {
  return (
    <AppErrorState
      code="404"
      title="Page introuvable"
      description="La page demandée n’existe pas, a été déplacée ou n’est plus disponible. Vous pouvez revenir en arrière, actualiser ou retourner à l’accueil."
      variant="not-found"
    />
  )
}
