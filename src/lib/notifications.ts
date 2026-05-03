import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import type { User } from '@/lib/types'

export type AppNotificationType = 'like' | 'follow' | 'purchase'

export async function createAppNotification(
  firestore: Firestore,
  input: {
    recipientId?: string | null
    actorId?: string | null
    actor?: Pick<User, 'name' | 'username' | 'avatarUrl'> | null
    type: AppNotificationType
    content: string
    metadata?: Record<string, any>
  }
) {
  if (!input.recipientId || input.recipientId === input.actorId) return

  await addDoc(collection(firestore, 'notifications'), {
    recipientId: input.recipientId,
    actorId: input.actorId || null,
    actor: input.actor || null,
    type: input.type,
    content: input.content,
    metadata: input.metadata || {},
    read: false,
    createdAt: serverTimestamp(),
  })
}
