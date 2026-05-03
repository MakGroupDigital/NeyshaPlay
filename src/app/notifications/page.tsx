'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, Heart, ShoppingBag, UserPlus } from 'lucide-react'
import { collection, doc, limit, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { Notification } from '@/lib/types'

const iconByType = {
  like: Heart,
  follow: UserPlus,
  purchase: ShoppingBag,
  comment: Bell,
}

function formatDate(value: any) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function NotificationsPage() {
  const firestore = useFirestore()
  const { user, loading } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  )

  useEffect(() => {
    if (loading) return
    if (!firestore || !user) {
      setIsLoading(false)
      return
    }

    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(80)
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as Notification[]
        next.sort((a, b) => {
          const aTime = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : 0
          const bTime = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : 0
          return bTime - aTime
        })
        setNotifications(next)
        setIsLoading(false)
      },
      (error) => {
        console.error('Notifications listener error:', error)
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [firestore, loading, user])

  const markAllAsRead = async () => {
    if (!firestore) return
    const unread = notifications.filter((notification) => !notification.read)
    if (unread.length === 0) return
    const batch = writeBatch(firestore)
    unread.forEach((notification) => {
      batch.update(doc(firestore, 'notifications', notification.id), { read: true })
    })
    await batch.commit()
  }

  const markOneAsRead = async (notification: Notification) => {
    if (!firestore || notification.read) return
    await updateDoc(doc(firestore, 'notifications', notification.id), { read: true })
  }

  if (!user && !loading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center px-4 text-center text-muted-foreground">
        Connectez-vous pour voir vos notifications.
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} nouvelle${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
          </p>
        </div>
        <Button variant="secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
          Tout lu
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl bg-white/10" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-muted-foreground">
          Aucune notification pour le moment.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = iconByType[notification.type] || Bell
            const actor = notification.actor || notification.user
            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => markOneAsRead(notification)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
              >
                <Avatar className="h-11 w-11">
                  <AvatarImage src={actor?.avatarUrl} alt={actor?.name || 'Notification'} />
                  <AvatarFallback>{actor?.name?.charAt(0) || <Icon className="h-4 w-4" />}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{notification.content}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(notification.createdAt || notification.timestamp)}</p>
                </div>
                {!notification.read && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
