"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type PendingItem = { purchaseId: string; videoId?: string }
type Status = 'pending' | 'completed' | 'failed'

const STORAGE_KEY = 'pendingPurchases'

function readPending(): PendingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((p) => p?.purchaseId)
    return []
  } catch {
    return []
  }
}

function writePending(list: PendingItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function PendingPurchaseWatcher() {
  const [pending, setPending] = useState<PendingItem[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [notification, setNotification] = useState<{ status: Status; videoId?: string; purchaseId: string } | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setPending(readPending())

    const sync = () => setPending(readPending())
    window.addEventListener('pending-purchase-added', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('pending-purchase-added', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (pending.length === 0) return

    const poll = async () => {
      for (const item of pending) {
        try {
          const res = await fetch('/api/wonyapay/purchase/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ purchaseId: item.purchaseId }),
          })
          const data = await res.json()
          if (!res.ok) continue
          const status = (data?.transactionStatus as Status) || 'pending'
          if (status === 'pending') continue

          setPending((prev) => {
            const next = prev.filter((p) => p.purchaseId !== item.purchaseId)
            writePending(next)
            return next
          })

          setNotification({ status, videoId: item.videoId, purchaseId: item.purchaseId })

          window.dispatchEvent(
            new CustomEvent('purchase-status', {
              detail: { purchaseId: item.purchaseId, videoId: item.videoId, status },
            })
          )
        } catch {
          // ignore and retry on next tick
        }
      }
    }

    poll()
    pollingRef.current = setInterval(poll, 4000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [pending])

  const currentPending = useMemo(
    () => pending.find((p) => !hiddenIds.has(p.purchaseId)),
    [pending, hiddenIds]
  )

  const hideOverlay = () => {
    if (!currentPending) return
    setHiddenIds((prev) => new Set([...prev, currentPending.purchaseId]))
  }

  const stayOverlay = () => {}

  const closeNotification = () => setNotification(null)
  const onRetry = () => setNotification(null)
  const onSuccess = () => {
    setNotification(null)
    if (typeof window !== 'undefined') {
      window.location.assign('/')
    }
  }

  return (
    <>
      {currentPending && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-0 sm:p-0">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-t-3xl bg-background p-5 pb-[calc(6rem+env(safe-area-inset-bottom))] shadow-2xl border border-primary/40">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Nous sommes en attente de la confirmation de votre paiement</p>
              <p className="text-xs text-muted-foreground">Référence: {currentPending.purchaseId}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              <Button variant="secondary" className="w-full" onClick={stayOverlay}>
                Rester sur cette page
              </Button>
              <Button className="w-full" onClick={hideOverlay}>
                Continuer à naviguer
              </Button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] sm:left-auto sm:right-6 sm:w-96 animate-in slide-in-from-bottom-4 duration-300">
          <Card
            className={cn(
              'shadow-2xl border',
              notification.status === 'completed' ? 'border-emerald-500' : 'border-amber-500'
            )}
          >
            <CardContent className="space-y-3 pt-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {notification.status === 'completed' ? 'Paiement confirmé' : 'Paiement non abouti'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notification.status === 'completed'
                    ? 'Vous pouvez maintenant regarder le contenu acheté.'
                    : 'Vous pouvez réessayer ou revenir plus tard.'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {notification.status === 'completed' ? (
                  <Button className="flex-1" onClick={onSuccess}>
                    Regarder le contenu acheté
                  </Button>
                ) : (
                  <>
                    <Button className="flex-1" onClick={onRetry}>
                      Réessayer
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={closeNotification}>
                      Faire plus tard
                    </Button>
                  </>
                )}
              </div>
              <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={closeNotification}>
                Fermer
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
