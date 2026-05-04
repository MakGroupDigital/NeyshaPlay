'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export function PwaInstallAssistant() {
  const { toast } = useToast()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
      if (!isStandaloneDisplay()) {
        setVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    if (!isStandaloneDisplay()) {
      const dismissedAt = Number(sessionStorage.getItem('pwaInstallDismissedAt') || 0)
      if (!dismissedAt || Date.now() - dismissedAt > 30 * 60 * 1000) {
        window.setTimeout(() => setVisible(true), 1500)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    setBusy(true)
    try {
      if (installPrompt) {
        await installPrompt.prompt()
        await installPrompt.userChoice
        setInstallPrompt(null)
      } else {
        toast({
          title: 'Installation depuis le navigateur',
          description: 'Utilisez le menu du navigateur pour ajouter NeyshaPlay à votre écran d’accueil.',
        })
      }

      setVisible(false)
    } catch (error: any) {
      toast({
        title: 'Installation incomplète',
        description: error?.message || 'Installation impossible pour le moment.',
        variant: 'destructive',
      })
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    sessionStorage.setItem('pwaInstallDismissedAt', String(Date.now()))
    setVisible(false)
  }

  if (!visible || isStandaloneDisplay()) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] px-4 md:bottom-5 md:left-auto md:right-5 md:max-w-sm md:px-0">
      <Card className="border-primary/20 bg-background/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Fermer"
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="pr-7">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Smartphone className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold">Télécharger NeyshaPlay</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Installez l’app sur votre téléphone pour ouvrir NeyshaPlay plus vite et profiter d’une expérience plein écran.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <Button className="gap-2" onClick={handleInstall} disabled={busy}>
            <Download className="h-4 w-4" />
            {busy ? 'Installation...' : 'Télécharger l’app'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
