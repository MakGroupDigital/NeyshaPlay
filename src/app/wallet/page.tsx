'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFirestore, useUser } from '@/firebase'
import { ClientFormattedNumber } from '@/components/client-formatted-number'
import type { Transaction, Wallet } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

type WalletState = {
  wallet: Wallet | null
  transactions: Transaction[]
}

const emptyState: WalletState = {
  wallet: null,
  transactions: [],
}

export default function WalletPage() {
  const { user, loading: userLoading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [{ wallet, transactions }, setWalletState] = useState<WalletState>(emptyState)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawPhone, setWithdrawPhone] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/login')
    }
  }, [user, userLoading, router])

  const fetchWallet = useCallback(async () => {
    if (!firestore || !user) return
    setLoading(true)

    try {
      const directRef = doc(firestore, 'wallets', user.uid)
      const directSnap = await getDoc(directRef)

      if (directSnap.exists()) {
        const data = { id: directSnap.id, ...directSnap.data() } as Wallet
        setWalletState({
          wallet: data,
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
        })
        setLoading(false)
        return
      }

      const walletsQuery = query(
        collection(firestore, 'wallets'),
        where('userId', '==', user.uid),
        limit(1)
      )
      const walletsSnapshot = await getDocs(walletsQuery)

      if (!walletsSnapshot.empty) {
        const docSnap = walletsSnapshot.docs[0]
        const data = { id: docSnap.id, ...docSnap.data() } as Wallet
        setWalletState({
          wallet: data,
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
        })
      } else {
        setWalletState(emptyState)
      }
    } catch (error) {
      console.error('Error loading wallet:', error)
      setWalletState(emptyState)
    } finally {
      setLoading(false)
    }
  }, [firestore, user])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a: any, b: any) => {
        const aTime = typeof a?.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a?.createdAt || 0).getTime()
        const bTime = typeof b?.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b?.createdAt || 0).getTime()
        return bTime - aTime
      }),
    [transactions]
  )

  const balance = wallet?.balance ?? 0

  const handleWithdraw = useCallback(async () => {
    if (!user) return
    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: 'Montant invalide',
        description: 'Entrez un montant de retrait valide.',
        variant: 'destructive',
      })
      return
    }
    if (!withdrawPhone.trim()) {
      toast({
        title: 'Numero requis',
        description: 'Entrez un numero Mobile Money.',
        variant: 'destructive',
      })
      return
    }
    if (amount > balance) {
      toast({
        title: 'Solde insuffisant',
        description: 'Votre solde ne permet pas ce retrait.',
        variant: 'destructive',
      })
      return
    }

    setIsWithdrawing(true)
    try {
      const response = await fetch('/api/wonyapay/withdraw/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          amount,
          phoneNumber: withdrawPhone.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Retrait WonyaPay impossible')
      }

      if (data?.transactionStatus === 'pending') {
        toast({
          title: 'Retrait initie',
          description: 'Le retrait est en cours de confirmation chez l’operateur.',
        })

        for (let attempt = 0; attempt < 20; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 4000))
          const statusResponse = await fetch('/api/wonyapay/withdraw/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              transactionId: data.transactionId,
            }),
          })
          const statusData = await statusResponse.json()
          if (!statusResponse.ok) {
            throw new Error(statusData?.error || 'Impossible de verifier le retrait')
          }
          if (statusData?.transactionStatus === 'completed') {
            break
          }
          if (statusData?.transactionStatus === 'failed') {
            throw new Error(statusData?.message || 'Retrait refuse ou annule')
          }
        }
      }

      await fetchWallet()
      setShowWithdrawDialog(false)
      setWithdrawAmount('')
      toast({
        title: 'Retrait traite',
        description: 'Votre retrait WonyaPay a ete pris en compte.',
      })
    } catch (error: any) {
      toast({
        title: 'Retrait echoue',
        description: error?.message || 'Veuillez reessayer.',
        variant: 'destructive',
      })
    } finally {
      setIsWithdrawing(false)
    }
  }, [balance, fetchWallet, toast, user, withdrawAmount, withdrawPhone])

  if (userLoading || loading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Portefeuille</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos revenus et retraits en toute simplicité.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <WalletIcon className="h-6 w-6" />
        </div>
      </div>

      <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-[#0f0f10] via-[#141414] to-[#0a0a0a]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_40%)]" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Solde disponible
            </CardTitle>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <span>Carte Neysha</span>
              <span>•••• 2045</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold">
              <ClientFormattedNumber value={balance} />
            </span>
            <span className="text-lg text-muted-foreground">USD</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-primary/40 bg-black/50">
                {/* Logo */}
                <img
                  src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png"
                  alt="NeyshaPlay"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">NeyshaPay</p>
                <p className="text-xs text-muted-foreground">Carte virtuelle</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Expire</p>
              <p className="text-sm text-foreground/90">08/28</p>
            </div>
          </div>

        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" className="gap-2" onClick={() => setShowWithdrawDialog(true)}>
          <ArrowUpRight className="h-4 w-4" />
          Retirer
        </Button>
        <Button size="lg" variant="secondary" className="gap-2">
          <ArrowDownToLine className="h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Transactions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                Aucune transaction pour le moment.
              </p>
              <p className="text-xs text-muted-foreground">
                Vos revenus apparaîtront ici dès vos premières ventes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTransactions.slice(0, 6).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {transaction.type === 'debit' || transaction.type === 'withdrawal' ? '-' : '+'}
                      <ClientFormattedNumber value={transaction.amount} /> {transaction.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">{transaction.type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer avec WonyaPay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-muted-foreground">
              Le retrait sera envoye via WonyaPay Mobile Money en USD.
            </div>
            <div className="grid gap-2">
              <Label htmlFor="withdraw-amount">Montant (USD)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                min="0"
                step="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="withdraw-phone">Numero Mobile Money</Label>
              <Input
                id="withdraw-phone"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                placeholder="0997654321"
              />
            </div>
            <Button className="w-full" onClick={handleWithdraw} disabled={isWithdrawing}>
              {isWithdrawing ? 'Traitement...' : 'Confirmer le retrait'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
