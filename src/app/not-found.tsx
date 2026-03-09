import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-6xl font-bold font-headline text-primary">404</h1>
      <h2 className="text-2xl font-semibold">Page introuvable</h2>
      <p className="text-muted-foreground max-w-md">
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Button asChild className="mt-4">
        <Link href="/">Retour à l'accueil</Link>
      </Button>
    </div>
  )
}
