'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileBadge,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Video,
  XCircle,
} from 'lucide-react'
import { useDoc, useFirestore, useUser } from '@/firebase'
import type { Transaction, User, UserRole, Wallet } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { isAdminRole } from '@/lib/roles'

type AdminKyc = {
  id: string
  userId?: string
  status?: 'draft' | 'pending' | 'approved' | 'rejected'
  selfieVideoUrl?: string
  documentUrl?: string
  documentType?: string
  rejectionReason?: string
  submittedAt?: any
  updatedAt?: any
}

type WithdrawalRequest = {
  id: string
  userId: string
  walletId?: string
  amount: number
  platformCommissionPercent?: number
  platformCommissionAmount?: number
  netPayoutAmount?: number
  currency?: string
  method?: string
  phoneNumber?: string
  status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed'
  rejectionReason?: string
  createdAt?: any
  updatedAt?: any
}

type AdminVideo = {
  id: string
  description?: string
  user?: any
  userId?: string
  userRef?: any
  videoUrl?: string
  thumbnailUrl?: string
  likes?: number
  views?: number
  price?: number
  isPaid?: boolean
  moderationStatus?: string
  createdAt?: any
}

type SearchTrend = {
  id: string
  term: string
  week?: string
  count?: number
}

type FinancePeriod = '7d' | '30d' | '90d' | 'all'
type KycStatus = NonNullable<AdminKyc['status']>

const APP_COMMISSION_PERCENT = 10

type AppSettings = {
  platformFeePercent: number
  minimumWalletDepositUsd: number
  minimumWithdrawUsd: number
  minimumPaidMediaUsd: number
  maintenanceMode: boolean
  creatorApprovalRequired: boolean
  supportMessage: string
}

const defaultSettings: AppSettings = {
  platformFeePercent: APP_COMMISSION_PERCENT,
  minimumWalletDepositUsd: 10,
  minimumWithdrawUsd: 10,
  minimumPaidMediaUsd: 1,
  maintenanceMode: false,
  creatorApprovalRequired: true,
  supportMessage: '',
}

function ts(value: any) {
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: any) {
  const millis = ts(value)
  if (!millis) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(millis))
}

function money(value: number | undefined, currency = 'USD') {
  return `${Number(value || 0).toFixed(2)} ${currency}`
}

function getPeriodStart(period: FinancePeriod) {
  if (period === 'all') return 0
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  return Date.now() - days * 24 * 60 * 60 * 1000
}

function pct(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function statusBadge(status?: string) {
  if (status === 'approved' || status === 'completed' || status === 'active') {
    return <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20">{status}</Badge>
  }
  if (status === 'pending' || status === 'draft') {
    return <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/20">{status}</Badge>
  }
  if (status === 'rejected' || status === 'failed' || status === 'banned') {
    return <Badge variant="destructive">{status}</Badge>
  }
  return <Badge variant="secondary">{status || '—'}</Badge>
}

function StatCard({ title, value, icon: Icon, detail }: { title: string; value: string | number; detail?: string; icon: any }) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboardPage() {
  const firestore = useFirestore()
  const { user: authUser, loading } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [videos, setVideos] = useState<AdminVideo[]>([])
  const [kycItems, setKycItems] = useState<AdminKyc[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [trends, setTrends] = useState<SearchTrend[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [savingSettings, setSavingSettings] = useState(false)
  const [filter, setFilter] = useState('all')
  const [financePeriod, setFinancePeriod] = useState<FinancePeriod>('30d')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser) return null
    return doc(firestore, 'users', authUser.uid)
  }, [authUser, firestore])
  const { data: profile, loading: profileLoading } = useDoc<User>(userDocRef as any)
  const isAdmin = isAdminRole(profile?.role)

  useEffect(() => {
    if (!loading && !authUser) router.replace('/login')
  }, [authUser, loading, router])

  useEffect(() => {
    if (!loading && !profileLoading && profile && !isAdminRole(profile.role)) {
      router.replace('/')
    }
  }, [loading, profile, profileLoading, router])

  useEffect(() => {
    if (!firestore || !isAdmin) return

    const unsubscribers = [
      onSnapshot(collection(firestore, 'users'), (snap) => {
        setUsers(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as User).sort((a, b) => ts(b.createdAt) - ts(a.createdAt)))
      }),
      onSnapshot(collection(firestore, 'videos'), (snap) => {
        setVideos(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as AdminVideo).sort((a, b) => ts(b.createdAt) - ts(a.createdAt)))
      }),
      onSnapshot(collection(firestore, 'creatorKyc'), (snap) => {
        setKycItems(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as AdminKyc).sort((a, b) => ts(b.submittedAt || b.updatedAt) - ts(a.submittedAt || a.updatedAt)))
      }),
      onSnapshot(collection(firestore, 'withdrawalRequests'), (snap) => {
        setWithdrawals(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as WithdrawalRequest).sort((a, b) => ts(b.createdAt) - ts(a.createdAt)))
      }),
      onSnapshot(collection(firestore, 'wallets'), (snap) => {
        setWallets(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Wallet))
      }),
      onSnapshot(collection(firestore, 'searchTrends'), (snap) => {
        setTrends(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as SearchTrend).sort((a, b) => Number(b.count || 0) - Number(a.count || 0)).slice(0, 20))
      }),
      onSnapshot(collection(firestore, 'reports'), (snap) => {
        setReports(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as any).sort((a, b) => ts(b.createdAt) - ts(a.createdAt)))
      }),
      onSnapshot(doc(firestore, 'appConfig', 'global'), (snap) => {
        if (snap.exists()) setSettings({ ...defaultSettings, ...snap.data(), platformFeePercent: APP_COMMISSION_PERCENT } as AppSettings)
      }),
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [firestore, isAdmin])

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const totalWalletBalance = wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0)
  const allTransactions = wallets.flatMap((wallet) =>
    (Array.isArray(wallet.transactions) ? wallet.transactions : []).map((transaction) => ({
      ...transaction,
      walletOwnerId: wallet.userId || wallet.id,
      walletBalance: Number(wallet.balance || 0),
    }))
  )
  const financeStart = getPeriodStart(financePeriod)
  const financialTransactions = allTransactions.filter((tx) => {
    if (financePeriod === 'all') return true
    return ts(tx.createdAt) >= financeStart
  })
  const completedTransactions = financialTransactions.filter((tx) => tx.status === 'completed')
  const depositTransactions = completedTransactions.filter((tx) => tx.type === 'credit')
  const purchaseDebitTransactions = completedTransactions.filter((tx) => tx.type === 'debit')
  const creatorEarningTransactions = completedTransactions.filter((tx) => tx.type === 'earning')
  const completedWithdrawalTransactions = completedTransactions.filter((tx) => tx.type === 'withdrawal')
  const pendingWithdrawalTransactions = financialTransactions.filter((tx) => tx.type === 'withdrawal' && tx.status === 'pending')
  const grossContentSales = purchaseDebitTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const creatorRevenue = creatorEarningTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const depositsVolume = depositTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const withdrawalsPaid = completedWithdrawalTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const commissionRate = APP_COMMISSION_PERCENT / 100
  const sumCommission = (items: Transaction[]) =>
    items.reduce((sum, tx) => {
      const metadataCommission = Number(tx.metadata?.platformCommissionAmount)
      return sum + (Number.isFinite(metadataCommission) && metadataCommission > 0 ? metadataCommission : Number(tx.amount || 0) * commissionRate)
    }, 0)
  const depositCommission = sumCommission(depositTransactions)
  const purchaseCommission = sumCommission(purchaseDebitTransactions)
  const withdrawalCommission = sumCommission(completedWithdrawalTransactions)
  const commissionBase = depositsVolume + grossContentSales + withdrawalsPaid
  const platformRevenue = depositCommission + purchaseCommission + withdrawalCommission
  const netAfterCreatorPayout = Math.max(0, grossContentSales - creatorRevenue)
  const withdrawalsPendingAmount = withdrawals
    .filter((request) => request.status === 'pending')
    .reduce((sum, request) => sum + Number(request.amount || 0), 0)
  const financeByType = [
    { label: 'Dépôts wallet', value: depositsVolume, total: depositsVolume + grossContentSales + withdrawalsPaid },
    { label: 'Achats contenus', value: grossContentSales, total: depositsVolume + grossContentSales + withdrawalsPaid },
    { label: 'Retraits payés', value: withdrawalsPaid, total: depositsVolume + grossContentSales + withdrawalsPaid },
  ]
  const commissionBreakdown = [
    { label: 'Commission sur dépôts', base: depositsVolume, commission: depositCommission },
    { label: 'Commission sur achats', base: grossContentSales, commission: purchaseCommission },
    { label: 'Commission sur retraits', base: withdrawalsPaid, commission: withdrawalCommission },
  ]
  const depositsByMethod = depositTransactions.reduce<Record<string, number>>((acc, tx) => {
    const method = tx.metadata?.depositMethod || 'autre'
    acc[method] = (acc[method] || 0) + Number(tx.amount || 0)
    return acc
  }, {})
  const creatorRevenueRows = creatorEarningTransactions
    .reduce<Map<string, { userId: string; amount: number; count: number }>>((acc, tx) => {
      const userId = String((tx as any).walletOwnerId || '')
      if (!userId) return acc
      const current = acc.get(userId) || { userId, amount: 0, count: 0 }
      current.amount += Number(tx.amount || 0)
      current.count += 1
      acc.set(userId, current)
      return acc
    }, new Map())
  const topCreatorRevenue = Array.from(creatorRevenueRows.values()).sort((a, b) => b.amount - a.amount).slice(0, 8)
  const latestFinancialTransactions = [...financialTransactions]
    .sort((a, b) => ts(b.createdAt) - ts(a.createdAt))
    .slice(0, 12)
  const selectedUser = selectedUserId ? userMap.get(selectedUserId) || null : null
  const selectedUserVideos = selectedUserId
    ? videos.filter((video) => (video.userRef?.id || video.userId || video.user?.id) === selectedUserId)
    : []
  const selectedUserWallet = selectedUserId
    ? wallets.find((wallet) => wallet.userId === selectedUserId || wallet.id === selectedUserId) || null
    : null
  const selectedUserTransactions = selectedUserWallet?.transactions || []
  const selectedUserViews = selectedUserVideos.reduce((sum, video) => sum + Number(video.views || 0), 0)
  const selectedUserLikes = selectedUserVideos.reduce((sum, video) => sum + Number(video.likes || 0), 0)
  const selectedUserRevenue = selectedUserTransactions
    .filter((tx) => tx.type === 'earning' && tx.status === 'completed')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const activeUsers = users.filter((user) => Date.now() - ts(user.lastSeenAt) < 10 * 60_000)
  const creators = users.filter((user) => user.role === 'creator')
  const pendingKyc = kycItems.filter((item) => item.status === 'pending')
  const pendingWithdrawals = withdrawals.filter((item) => item.status === 'pending')

  const filteredUsers = users.filter((user) => {
    if (filter === 'all') return true
    if (filter === 'banned') return user.status === 'banned'
    if (filter === 'active') return user.status !== 'banned'
    return user.role === filter
  })

  const topCreators = creators
    .map((creator) => {
      const creatorVideos = videos.filter((video) => (video.userRef?.id || video.userId) === creator.id)
      return {
        ...creator,
        videos: creatorVideos.length,
        views: creatorVideos.reduce((sum, video) => sum + Number(video.views || 0), 0),
      }
    })
    .sort((a, b) => Number(b.likes || 0) + b.views - (Number(a.likes || 0) + a.views))
    .slice(0, 10)

  const createNotification = async (userId: string, content: string, metadata?: Record<string, any>) => {
    if (!firestore) return
    await addDoc(collection(firestore, 'notifications'), {
      recipientId: userId,
      type: 'system',
      content,
      read: false,
      createdAt: serverTimestamp(),
      metadata: metadata || {},
      user: { name: 'Admin NeyshaPlay', username: '@admin', avatarUrl: '' },
    })
  }

  const updateUserRole = async (userId: string, role: UserRole) => {
    if (!firestore) return
    setBusyId(userId)
    try {
      await setDoc(doc(firestore, 'users', userId), { role, updatedAt: serverTimestamp() }, { merge: true })
      await createNotification(userId, `Votre rôle a été mis à jour: ${role}.`, { role })
      toast({ title: 'Rôle mis à jour' })
    } finally {
      setBusyId(null)
    }
  }

  const setUserBan = async (userId: string, banned: boolean) => {
    if (!firestore) return
    setBusyId(userId)
    try {
      await setDoc(
        doc(firestore, 'users', userId),
        { status: banned ? 'banned' : 'active', updatedAt: serverTimestamp() },
        { merge: true }
      )
      await createNotification(userId, banned ? 'Votre compte a été suspendu par la modération.' : 'Votre compte a été réactivé.')
      toast({ title: banned ? 'Compte banni' : 'Compte réactivé' })
    } finally {
      setBusyId(null)
    }
  }

  const reviewKyc = async (kyc: AdminKyc, status: KycStatus) => {
    if (!firestore) return
    const userId = kyc.userId || kyc.id
    const reason = status === 'rejected' ? window.prompt('Motif du rejet KYC') || 'Dossier non conforme' : ''
    setBusyId(kyc.id)
    try {
      await setDoc(
        doc(firestore, 'creatorKyc', kyc.id),
        { status, rejectionReason: reason, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(), reviewedBy: authUser?.uid || null },
        { merge: true }
      )
      await setDoc(
        doc(firestore, 'users', userId),
        { kycStatus: status, ...(status === 'approved' ? { role: 'creator' } : {}), updatedAt: serverTimestamp() },
        { merge: true }
      )
      await createNotification(
        userId,
        status === 'approved'
          ? 'Votre identité a été approuvée. Les retraits sont maintenant débloqués.'
          : status === 'rejected'
            ? `Votre vérification d’identité a été rejetée: ${reason}`
            : `Le statut de votre vérification d’identité est maintenant: ${status}.`,
        { kycStatus: status }
      )
      toast({ title: `KYC mis à jour: ${status}` })
    } finally {
      setBusyId(null)
    }
  }

  const reviewWithdrawal = async (request: WithdrawalRequest, status: 'completed' | 'rejected') => {
    if (!firestore) return
    const reason = status === 'rejected' ? window.prompt('Motif du rejet') || 'Demande rejetée' : ''
    setBusyId(request.id)
    try {
      const walletRef = request.walletId ? doc(firestore, 'wallets', request.walletId) : doc(firestore, 'wallets', request.userId)
      const walletSnap = await getDoc(walletRef)
      if (!walletSnap.exists()) throw new Error('Portefeuille introuvable')
      const wallet = { id: walletSnap.id, ...walletSnap.data() } as Wallet
      const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : []
      const requestCommission = Number(request.platformCommissionAmount || Number(request.amount || 0) * commissionRate)
      const requestNetPayout = Number(request.netPayoutAmount || Math.max(0, Number(request.amount || 0) - requestCommission))
      const updatedTransactions = transactions.map((tx: Transaction) => {
        if (tx.metadata?.withdrawalRequestId !== request.id && tx.id !== `withdraw_request_${request.id}`) return tx
        return {
          ...tx,
          status: status === 'completed' ? 'completed' : 'failed',
          metadata: {
            ...tx.metadata,
            rejectionReason: reason,
            platformCommissionPercent: APP_COMMISSION_PERCENT,
            platformCommissionAmount: requestCommission,
            grossAmount: Number(request.amount || 0),
            netPayoutAmount: requestNetPayout,
          },
        } as Transaction
      })
      const nextBalance =
        status === 'completed'
          ? Math.max(0, Number(wallet.balance || 0) - Number(request.amount || 0))
          : Number(wallet.balance || 0)

      await updateDoc(walletRef, {
        balance: nextBalance,
        transactions: updatedTransactions,
        updatedAt: serverTimestamp(),
      })
      await setDoc(
        doc(firestore, 'withdrawalRequests', request.id),
        {
          status,
          rejectionReason: reason,
          platformCommissionPercent: APP_COMMISSION_PERCENT,
          platformCommissionAmount: requestCommission,
          netPayoutAmount: requestNetPayout,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          reviewedBy: authUser?.uid || null,
        },
        { merge: true }
      )
      await createNotification(
        request.userId,
        status === 'completed'
          ? `Votre retrait de ${money(request.amount, request.currency || 'USD')} a été approuvé. Montant net envoyé: ${money(requestNetPayout, request.currency || 'USD')}.`
          : `Votre demande de retrait a été rejetée: ${reason}`,
        { withdrawalRequestId: request.id }
      )
      toast({ title: status === 'completed' ? 'Retrait approuvé' : 'Retrait rejeté' })
    } catch (error: any) {
      toast({ title: 'Action impossible', description: error?.message || 'Veuillez réessayer.', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  const moderateVideo = async (video: AdminVideo, moderationStatus: 'hidden' | 'approved') => {
    if (!firestore) return
    setBusyId(video.id)
    try {
      await setDoc(doc(firestore, 'videos', video.id), { moderationStatus, updatedAt: serverTimestamp() }, { merge: true })
      const ownerId = video.userRef?.id || video.userId
      if (ownerId) {
        await createNotification(
          ownerId,
          moderationStatus === 'hidden' ? 'Un de vos contenus a été masqué par la modération.' : 'Un de vos contenus a été rétabli.',
          { videoId: video.id, moderationStatus }
        )
      }
      toast({ title: moderationStatus === 'hidden' ? 'Contenu masqué' : 'Contenu rétabli' })
    } finally {
      setBusyId(null)
    }
  }

  const saveSettings = async () => {
    if (!firestore) return
    setSavingSettings(true)
    try {
      await setDoc(
        doc(firestore, 'appConfig', 'global'),
        { ...settings, updatedAt: serverTimestamp(), updatedBy: authUser?.uid || null },
        { merge: true }
      )
      toast({ title: 'Paramètres enregistrés' })
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading || profileLoading || (authUser && !profile)) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Accès administrateur requis</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ce dashboard est réservé aux comptes de type Admin.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Control Center
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contrôle centralisé des comptes, contenus, KYC, finances, CRM et réglages globaux.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          Naviguer comme admin
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Utilisateurs" value={users.length} detail={`${activeUsers.length} connectés récemment`} icon={Users} />
        <StatCard title="Créateurs" value={creators.length} detail={`${pendingKyc.length} KYC en attente`} icon={FileBadge} />
        <StatCard title="Contenus" value={videos.length} detail={`${reports.length} signalements`} icon={Video} />
        <StatCard title="Retraits en attente" value={pendingWithdrawals.length} detail={money(pendingWithdrawals.reduce((s, w) => s + Number(w.amount || 0), 0))} icon={Clock3} />
        <StatCard title="Wallet central" value={money(totalWalletBalance)} detail={`Commission estimée ${money(platformRevenue)}`} icon={BadgeDollarSign} />
      </div>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-white/5 p-1 md:grid-cols-5">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="moderation">Modération & KYC</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="settings">App Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Management des utilisateurs & rôles</CardTitle>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">Tous</option>
                <option value="active">Actifs</option>
                <option value="banned">Bannis</option>
                <option value="user">Utilisateurs</option>
                <option value="creator">Créateurs</option>
                <option value="admin">Admins</option>
              </select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Compte</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium underline-offset-4 hover:underline"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          {user.name || 'Sans nom'}
                        </button>
                        <div className="text-xs text-muted-foreground">{user.username || user.email || user.id}</div>
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={user.role || 'user'}
                          disabled={busyId === user.id}
                          onChange={(event) => updateUserRole(user.id, event.target.value as UserRole)}
                        >
                          <option value="user">User</option>
                          <option value="creator">Creator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{[user.city, user.country].filter(Boolean).join(', ') || '—'}</TableCell>
                      <TableCell>{statusBadge(user.status || 'active')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastSeenAt || user.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={user.status === 'banned' ? 'secondary' : 'destructive'} onClick={() => setUserBan(user.id, user.status !== 'banned')}>
                          {user.status === 'banned' ? 'Réactiver' : 'Bannir'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Pipeline KYC créateurs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {kycItems.length === 0 ? (
                  <p className="rounded-lg border border-white/10 p-4 text-sm text-muted-foreground">Aucun dossier KYC.</p>
                ) : (
                  kycItems.map((kyc) => {
                    const owner = userMap.get(kyc.userId || kyc.id)
                    return (
                      <div key={kyc.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="font-semibold underline-offset-4 hover:underline"
                                onClick={() => setSelectedUserId(kyc.userId || kyc.id)}
                              >
                                {owner?.name || kyc.userId || kyc.id}
                              </button>
                              {statusBadge(kyc.status)}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Soumis: {formatDate(kyc.submittedAt || kyc.updatedAt)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <select
                              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                              value={kyc.status || 'draft'}
                              disabled={busyId === kyc.id}
                              onChange={(event) => reviewKyc(kyc, event.target.value as KycStatus)}
                            >
                              <option value="draft">Brouillon</option>
                              <option value="pending">En attente</option>
                              <option value="approved">Approuvé</option>
                              <option value="rejected">Rejeté</option>
                            </select>
                            <Button size="sm" disabled={busyId === kyc.id || kyc.status === 'approved'} onClick={() => reviewKyc(kyc, 'approved')}>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              {kyc.status === 'approved' ? 'Déjà approuvé' : 'Approuver'}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={busyId === kyc.id} onClick={() => reviewKyc(kyc, 'rejected')}>
                              <XCircle className="mr-1 h-4 w-4" />
                              Rejeter
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <a className={cn('rounded-lg border border-white/10 p-3 text-sm hover:bg-white/5', !kyc.selfieVideoUrl && 'pointer-events-none opacity-50')} href={kyc.selfieVideoUrl || '#'} target="_blank" rel="noreferrer">
                            <Eye className="mb-2 h-4 w-4 text-primary" />
                            Visionner la vidéo selfie
                          </a>
                          <a className={cn('rounded-lg border border-white/10 p-3 text-sm hover:bg-white/5', !kyc.documentUrl && 'pointer-events-none opacity-50')} href={kyc.documentUrl || '#'} target="_blank" rel="noreferrer">
                            <FileBadge className="mb-2 h-4 w-4 text-primary" />
                            Voir la pièce: {kyc.documentType || 'document'}
                          </a>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Signalements & contenus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reports.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      {reports.length} signalements à traiter
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {videos.slice(0, 20).map((video) => (
                    <div key={video.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-3">
                      <div className="h-14 w-10 overflow-hidden rounded bg-black">
                        {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{video.description || 'Contenu sans description'}</p>
                        <p className="text-xs text-muted-foreground">{Number(video.views || 0).toLocaleString()} vues · {Number(video.likes || 0).toLocaleString()} likes</p>
                      </div>
                      <Button size="sm" variant={video.moderationStatus === 'hidden' ? 'secondary' : 'destructive'} onClick={() => moderateVideo(video, video.moderationStatus === 'hidden' ? 'approved' : 'hidden')}>
                        {video.moderationStatus === 'hidden' ? 'Rétablir' : 'Masquer'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                Période financière
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Commission globale fixe: {APP_COMMISSION_PERCENT}% sur dépôts, achats et retraits.
              </p>
            </div>
            <div className="flex gap-2">
              {([
                { value: '7d', label: '7 jours' },
                { value: '30d', label: '30 jours' },
                { value: '90d', label: '90 jours' },
                { value: 'all', label: 'Tout' },
              ] as const).map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={financePeriod === item.value ? 'default' : 'outline'}
                  onClick={() => setFinancePeriod(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Commission globale app" value={money(platformRevenue)} detail={`10% de ${money(commissionBase)}`} icon={BadgeDollarSign} />
            <StatCard title="Ventes contenus" value={money(grossContentSales)} detail={`${purchaseDebitTransactions.length} déblocage(s)`} icon={BarChart3} />
            <StatCard title="Revenus créateurs" value={money(creatorRevenue)} detail={`${creatorEarningTransactions.length} paiement(s) créateur`} icon={Users} />
            <StatCard title="Dépôts wallet" value={money(depositsVolume)} detail={`${depositTransactions.length} dépôt(s) validé(s)`} icon={Download} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Rapport financier global</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-muted-foreground">Solde total dans les wallets</p>
                  <p className="mt-1 text-2xl font-semibold">{money(totalWalletBalance)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-muted-foreground">Retraits payés</p>
                  <p className="mt-1 text-2xl font-semibold">{money(withdrawalsPaid)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-muted-foreground">Retraits en attente</p>
                  <p className="mt-1 text-2xl font-semibold">{money(withdrawalsPendingAmount)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs text-muted-foreground">Transactions période</p>
                  <p className="mt-1 text-2xl font-semibold">{financialTransactions.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Formule commission globale</p>
                  <p className="mt-1 text-lg font-semibold">
                    ({money(depositsVolume)} dépôts + {money(grossContentSales)} achats + {money(withdrawalsPaid)} retraits) x {APP_COMMISSION_PERCENT}%
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:col-span-2">
                  <p className="text-sm font-semibold text-primary">Lecture rapide</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Entrées wallet: {money(depositsVolume)}. Ventes de contenus: {money(grossContentSales)}.
                    Commission app: {money(platformRevenue)}. Obligations créateurs en attente de retrait: {money(totalWalletBalance)}.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Répartition des flux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {financeByType.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{money(item.value)} · {pct(item.value, item.total)}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct(item.value, item.total)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-4">
                  <p className="mb-2 text-sm font-semibold">Commission app à 10%</p>
                  <div className="space-y-2">
                    {commissionBreakdown.map((item) => (
                      <div key={item.label} className="flex justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                        <span>{item.label}</span>
                        <span>{money(item.commission)} <span className="text-muted-foreground">sur {money(item.base)}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <p className="mb-2 text-sm font-semibold">Méthodes de dépôt</p>
                  {Object.keys(depositsByMethod).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun dépôt validé sur cette période.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(depositsByMethod).map(([method, amount]) => (
                        <div key={method} className="flex justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                          <span>{method === 'maxicash' ? 'Mobile Money' : method}</span>
                          <span>{money(amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Top créateurs par revenus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topCreatorRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun revenu créateur sur cette période.</p>
                ) : (
                  topCreatorRevenue.map((row, index) => {
                    const creator = userMap.get(row.userId)
                    return (
                      <div key={row.userId} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                        <div>
                          <p className="text-sm font-medium">#{index + 1} {creator?.name || row.userId}</p>
                          <p className="text-xs text-muted-foreground">{row.count} vente(s) rémunérée(s)</p>
                        </div>
                        <Badge variant="secondary">{money(row.amount)}</Badge>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle>Historique financier récent</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestFinancialTransactions.map((tx) => {
                      const owner = userMap.get((tx as any).walletOwnerId)
                      return (
                        <TableRow key={`${(tx as any).walletOwnerId}_${tx.id}`}>
                          <TableCell>
                            <div className="font-medium">{tx.type}</div>
                            <div className="text-xs text-muted-foreground">{tx.metadata?.depositMethod || tx.metadata?.withdrawalMethod || tx.metadata?.orderId || '—'}</div>
                          </TableCell>
                          <TableCell>{owner?.name || (tx as any).walletOwnerId || '—'}</TableCell>
                          <TableCell>{money(Number(tx.amount || 0), tx.currency || 'USD')}</TableCell>
                          <TableCell>{statusBadge(tx.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle>Validation manuelle des retraits</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Créateur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((request) => {
                    const owner = userMap.get(request.userId)
                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="font-medium">{owner?.name || request.userId}</div>
                          <div className="text-xs text-muted-foreground">{request.phoneNumber || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{money(request.amount, request.currency || 'USD')}</div>
                          <div className="text-xs text-muted-foreground">
                            Commission {money(request.platformCommissionAmount || Number(request.amount || 0) * commissionRate, request.currency || 'USD')} · Net {money(request.netPayoutAmount || Number(request.amount || 0) * (1 - commissionRate), request.currency || 'USD')}
                          </div>
                        </TableCell>
                        <TableCell>{request.method || 'mobile_money'}</TableCell>
                        <TableCell>{statusBadge(request.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" disabled={request.status !== 'pending' || busyId === request.id} onClick={() => reviewWithdrawal(request, 'completed')}>
                              Approuver
                            </Button>
                            <Button size="sm" variant="destructive" disabled={request.status !== 'pending' || busyId === request.id} onClick={() => reviewWithdrawal(request, 'rejected')}>
                              Rejeter
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Live Map simplifiée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun utilisateur actif détecté sur les 10 dernières minutes.</p>
                ) : (
                  activeUsers.slice(0, 20).map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                      <div>
                        <p className="text-sm font-medium">{user.name || user.username}</p>
                        <p className="text-xs text-muted-foreground">{[user.city, user.country].filter(Boolean).join(', ') || (user as any).clientInfo?.timeZone || 'Localisation non renseignée'}</p>
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Tendances & tops créateurs</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Search className="h-4 w-4 text-primary" />
                    Recherches populaires de la semaine
                  </div>
                  <div className="space-y-2">
                    {trends.slice(0, 8).map((trend) => (
                      <div key={trend.id}>
                        <div className="flex justify-between text-xs">
                          <span>{trend.term}</span>
                          <span className="text-muted-foreground">{trend.count || 0}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Number(trend.count || 0) * 8)}%` }} />
                        </div>
                      </div>
                    ))}
                    {trends.length === 0 && <p className="text-sm text-muted-foreground">Les tendances apparaîtront après les premières recherches.</p>}
                  </div>
                </div>
                <div>
                  <div className="mb-3 text-sm font-semibold">Leaderboard créateurs</div>
                  <div className="space-y-2">
                    {topCreators.map((creator, index) => (
                      <div key={creator.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                        <div>
                          <p className="text-sm font-medium">#{index + 1} {creator.name}</p>
                          <p className="text-xs text-muted-foreground">{creator.videos} contenus · {creator.views.toLocaleString()} vues</p>
                        </div>
                        <Badge variant="secondary">{Number(creator.likes || 0).toLocaleString()} likes</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="border-white/10 bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-primary" /> Configuration dynamique</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Commission globale app (%)</Label>
                <Input type="number" value={APP_COMMISSION_PERCENT} disabled />
                <p className="text-xs text-muted-foreground">
                  Fixe à 10% sur dépôts, achats, retraits et autres revenus financiers. Cette valeur n’est pas modifiable depuis l’interface.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Dépôt minimum wallet (USD)</Label>
                <Input type="number" value={settings.minimumWalletDepositUsd} onChange={(event) => setSettings((prev) => ({ ...prev, minimumWalletDepositUsd: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Retrait minimum (USD)</Label>
                <Input type="number" value={settings.minimumWithdrawUsd} onChange={(event) => setSettings((prev) => ({ ...prev, minimumWithdrawUsd: Number(event.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Prix minimum média payant (USD)</Label>
                <Input type="number" value={settings.minimumPaidMediaUsd} onChange={(event) => setSettings((prev) => ({ ...prev, minimumPaidMediaUsd: Number(event.target.value) }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                <div>
                  <p className="font-medium">Mode maintenance</p>
                  <p className="text-xs text-muted-foreground">Permet de bloquer l’accès public dans une prochaine étape.</p>
                </div>
                <Switch checked={settings.maintenanceMode} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, maintenanceMode: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                <div>
                  <p className="font-medium">Validation créateur requise</p>
                  <p className="text-xs text-muted-foreground">Force la validation KYC avant retrait.</p>
                </div>
                <Switch checked={settings.creatorApprovalRequired} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, creatorApprovalRequired: checked }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Message global support / maintenance</Label>
                <Textarea value={settings.supportMessage} onChange={(event) => setSettings((prev) => ({ ...prev, supportMessage: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button onClick={saveSettings} disabled={savingSettings}>
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enregistrer les paramètres
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedUserId)} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Profil utilisateur détaillé</DialogTitle>
          </DialogHeader>
          {selectedUser ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{selectedUser.name || 'Sans nom'}</h3>
                    {statusBadge(selectedUser.status || 'active')}
                    {statusBadge(selectedUser.role)}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedUser.username || selectedUser.email || selectedUser.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[selectedUser.city, selectedUser.country].filter(Boolean).join(', ') || 'Localisation non renseignée'} · dernière activité {formatDate(selectedUser.lastSeenAt || selectedUser.updatedAt)}
                  </p>
                </div>
                <Button variant="outline" onClick={() => router.push(`/u/${selectedUser.username?.replace(/^@/, '') || selectedUser.id}`)}>
                  Voir le profil public
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Contenus publiés" value={selectedUserVideos.length} detail={`${selectedUserViews.toLocaleString()} vues`} icon={Video} />
                <StatCard title="Engagement" value={selectedUserLikes.toLocaleString()} detail={`${Number(selectedUser.followers || 0).toLocaleString()} abonnés`} icon={Users} />
                <StatCard title="Revenus créateur" value={money(selectedUserRevenue)} detail={`${selectedUserTransactions.length} transaction(s)`} icon={BadgeDollarSign} />
                <StatCard title="Solde wallet" value={money(selectedUserWallet?.balance || 0)} detail={selectedUserWallet?.currency || 'USD'} icon={BadgeDollarSign} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <CardTitle className="text-base">Habitudes & activité</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between rounded-lg border border-white/10 px-3 py-2">
                      <span>Type de contenu préféré</span>
                      <span className="text-muted-foreground">{selectedUser.feedGender || 'all'}</span>
                    </div>
                    <div className="flex justify-between rounded-lg border border-white/10 px-3 py-2">
                      <span>KYC</span>
                      <span>{selectedUser.kycStatus || 'not_started'}</span>
                    </div>
                    <div className="flex justify-between rounded-lg border border-white/10 px-3 py-2">
                      <span>Compte créé</span>
                      <span className="text-muted-foreground">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="flex justify-between rounded-lg border border-white/10 px-3 py-2">
                      <span>Transactions wallet</span>
                      <span className="text-muted-foreground">{selectedUserTransactions.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.03]">
                  <CardHeader>
                    <CardTitle className="text-base">Contenus récents</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedUserVideos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun contenu publié.</p>
                    ) : (
                      selectedUserVideos.slice(0, 6).map((video) => (
                        <div key={video.id} className="flex items-center gap-3 rounded-lg border border-white/10 p-2">
                          <div className="h-14 w-10 overflow-hidden rounded bg-black">
                            {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium">{video.description || 'Sans description'}</p>
                            <p className="text-xs text-muted-foreground">{Number(video.views || 0).toLocaleString()} vues · {Number(video.likes || 0).toLocaleString()} likes</p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Utilisateur introuvable.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
