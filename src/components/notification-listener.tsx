'use client'

import { useEffect, useRef } from 'react'
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { useFirestore, useUser } from '@/firebase'
import { useToast } from '@/hooks/use-toast'

export function NotificationListener() {
  const firestore = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const initializedRef = useRef(false)

  useEffect(() => {
    initializedRef.current = false
    if (!firestore || !user) return

    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(80)
    )

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        if (!initializedRef.current) {
          initializedRef.current = true
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added') return
          const notification = change.doc.data()
          if (notification.read) return

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification('NeyshaPlay', {
              body: notification.content || 'Vous avez une nouvelle notification.',
              icon: '/android-chrome-192x192.png',
              badge: '/favicon-32x32.png',
            })
            browserNotification.onclick = () => {
              window.focus()
              router.push('/notifications')
              browserNotification.close()
            }
          }

          toast({
            title: 'Nouvelle notification',
            description: notification.content || 'Vous avez une nouvelle notification.',
            onClick: () => router.push('/notifications'),
          } as any)
        })
      },
      (error) => {
        console.warn('Notification listener error:', error)
      }
    )

    return () => unsubscribe()
  }, [firestore, router, toast, user])

  return null
}
