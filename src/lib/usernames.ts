import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore'

export function normalizeUsername(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._]+/g, '')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 24)
}

export function usernameFromName(name: string, fallbackId?: string) {
  const normalized = normalizeUsername(name)
  if (normalized.length >= 3) return `@${normalized}`
  return `@user_${String(fallbackId || Date.now()).slice(0, 8).toLowerCase()}`
}

export function isEmailDerivedUsername(username?: string | null, email?: string | null) {
  const normalizedUsername = normalizeUsername(username || '')
  if (!normalizedUsername) return true
  if (normalizedUsername.includes('gmail') || normalizedUsername.includes('yahoo') || normalizedUsername.includes('hotmail')) return true
  const emailLocalPart = normalizeUsername(String(email || '').split('@')[0] || '')
  return Boolean(emailLocalPart && normalizedUsername === emailLocalPart)
}

export async function isUsernameAvailable(firestore: Firestore, username: string, currentUserId: string) {
  const usernameQuery = query(collection(firestore, 'users'), where('username', '==', username))
  const snapshot = await getDocs(usernameQuery)
  return snapshot.docs.every((docSnap) => docSnap.id === currentUserId)
}

export async function buildUniqueUsername(firestore: Firestore, name: string, currentUserId: string) {
  const base = usernameFromName(name, currentUserId)
  if (await isUsernameAvailable(firestore, base, currentUserId)) return base

  const baseWithoutAt = base.replace(/^@/, '').slice(0, 18)
  for (let index = 2; index <= 99; index += 1) {
    const candidate = `@${baseWithoutAt}${index}`
    if (await isUsernameAvailable(firestore, candidate, currentUserId)) return candidate
  }

  return `@${baseWithoutAt}${currentUserId.slice(0, 5).toLowerCase()}`
}
