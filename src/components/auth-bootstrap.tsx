'use client'

import { useEffect, useRef } from 'react'
import { doc, getDocFromServer, serverTimestamp, setDoc } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'
import { normalizeUserRole } from '@/lib/roles'
import { buildUniqueUsername, isEmailDerivedUsername, usernameFromName } from '@/lib/usernames'

export function AuthBootstrap() {
  const { user, loading } = useUser()
  const firestore = useFirestore()
  const bootstrappedRef = useRef<string | null>(null)

  useEffect(() => {
    if (loading || !user || !firestore) return
    if (bootstrappedRef.current === user.uid) return
    bootstrappedRef.current = user.uid

    const ensureProfile = async () => {
      const userRef = doc(firestore, 'users', user.uid)
      const snapshot = await getDocFromServer(userRef)

      const emailLocalPart = user.email?.split('@')[0] || ''
      const fallbackName = user.isAnonymous ? 'Invite' : `user_${user.uid.substring(0, 5)}`
      const baseName = user.displayName && user.displayName !== emailLocalPart ? user.displayName : fallbackName
      const baseUsername = usernameFromName(baseName, user.uid)
      const baseProfile = {
        name: baseName,
        username: baseUsername,
        email: user.email ?? '',
        avatarUrl: user.photoURL ?? '',
        bio: user.isAnonymous
          ? 'Invite sur NeyshaPlay'
          : 'Nouveau sur NeyshaPlay',
        followers: 0,
        following: 0,
        likes: 0,
        feedGender: 'all',
        createdAt: serverTimestamp(),
      }

      if (!snapshot.exists()) {
        await setDoc(userRef, { ...baseProfile, role: 'user' }, { merge: true })
        return
      }

      const data = snapshot.data() || {}
      const updates: Record<string, any> = { updatedAt: serverTimestamp() }

      if (!data.name) updates.name = baseProfile.name
      if (!data.username) {
        updates.username = baseProfile.username
      } else if (isEmailDerivedUsername(data.username, data.email || user.email) && data.name && data.name !== emailLocalPart) {
        updates.username = await buildUniqueUsername(firestore, data.name, user.uid)
      }
      if (!data.email && baseProfile.email) updates.email = baseProfile.email
      if (!data.avatarUrl && baseProfile.avatarUrl) updates.avatarUrl = baseProfile.avatarUrl
      if (!data.bio) updates.bio = baseProfile.bio
      if (typeof data.followers !== 'number') updates.followers = 0
      if (typeof data.following !== 'number') updates.following = 0
      if (typeof data.likes !== 'number') updates.likes = 0
      if (data.role && data.role !== normalizeUserRole(data.role)) updates.role = normalizeUserRole(data.role)
      if (!data.feedGender) {
        updates.feedGender = data.gender === 'female' || data.gender === 'male' ? data.gender : 'all'
      }

      if (Object.keys(updates).length > 1) {
        await setDoc(userRef, updates, { merge: true })
      }
    }

    ensureProfile().catch((error) => {
      console.warn('Auth bootstrap failed:', error)
    })
  }, [firestore, loading, user])

  useEffect(() => {
    if (loading || !user || !firestore) return

    const userRef = doc(firestore, 'users', user.uid)
    const touchPresence = () => {
      setDoc(
        userRef,
        {
          lastSeenAt: serverTimestamp(),
          clientInfo: {
            language: typeof navigator !== 'undefined' ? navigator.language : '',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
        { merge: true }
      ).catch((error) => {
        console.warn('Presence update failed:', error)
      })
    }

    touchPresence()
    const interval = window.setInterval(touchPresence, 60_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') touchPresence()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [firestore, loading, user])

  return null
}
