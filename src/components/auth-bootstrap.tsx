'use client'

import { useEffect, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useFirestore, useUser } from '@/firebase'

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
      const snapshot = await getDoc(userRef)

      const baseName =
        user.displayName ||
        user.email?.split('@')[0] ||
        (user.isAnonymous ? 'Invite' : `user_${user.uid.substring(0, 5)}`)
      const baseUsername =
        user.email?.split('@')[0]
          ? `@${user.email.split('@')[0]}`
          : `@${baseName}`.replace(/\s+/g, '')
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
        role: 'user',
        feedGender: 'all',
        createdAt: serverTimestamp(),
      }

      if (!snapshot.exists()) {
        await setDoc(userRef, baseProfile, { merge: true })
        return
      }

      const data = snapshot.data() || {}
      const updates: Record<string, any> = { updatedAt: serverTimestamp() }

      if (!data.name) updates.name = baseProfile.name
      if (!data.username) updates.username = baseProfile.username
      if (!data.email && baseProfile.email) updates.email = baseProfile.email
      if (!data.avatarUrl && baseProfile.avatarUrl) updates.avatarUrl = baseProfile.avatarUrl
      if (!data.bio) updates.bio = baseProfile.bio
      if (typeof data.followers !== 'number') updates.followers = 0
      if (typeof data.following !== 'number') updates.following = 0
      if (typeof data.likes !== 'number') updates.likes = 0
      if (!data.role) updates.role = 'user'
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

  return null
}
