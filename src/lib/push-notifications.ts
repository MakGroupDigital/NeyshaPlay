import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import type { FirebaseApp } from 'firebase/app'
import type { User } from 'firebase/auth'
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging'

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null

  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  if (existing) return existing

  return navigator.serviceWorker.register('/firebase-messaging-sw.js')
}

export async function enablePushNotifications(input: {
  firebaseApp: FirebaseApp | null
  firestore: Firestore | null
  user: User | null
}) {
  if (typeof window === 'undefined') return null
  if (!input.firebaseApp || !input.firestore || !input.user) return null
  if (!vapidKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY manquant')
  }

  const supported = await isSupported()
  if (!supported || !('Notification' in window)) {
    throw new Error('Notifications push non supportées sur ce navigateur')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Autorisation de notification refusée')
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    throw new Error('Service worker indisponible')
  }

  const messaging = getMessaging(input.firebaseApp)
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!token) {
    throw new Error('Token push indisponible')
  }

  await setDoc(
    doc(input.firestore, 'users', input.user.uid, 'pushTokens', token),
    {
      token,
      platform: 'web',
      userAgent: navigator.userAgent,
      enabled: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  )

  return token
}

export async function listenForegroundPush(
  firebaseApp: FirebaseApp | null,
  onNotification: (payload: any) => void
) {
  if (!firebaseApp) return () => undefined
  const supported = await isSupported()
  if (!supported) return () => undefined

  const messaging = getMessaging(firebaseApp)
  return onMessage(messaging, onNotification)
}
