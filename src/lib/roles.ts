import type { User, UserRole } from '@/lib/types'

export function normalizeUserRole(value: unknown): UserRole {
  const role = String(value || '').trim().toLowerCase()
  if (role === 'admin') return 'admin'
  if (role === 'creator') return 'creator'
  return 'user'
}

export function isAdminRole(value: unknown) {
  return normalizeUserRole(value) === 'admin'
}

export function hasCreatorKycStatus(status: unknown) {
  return status === 'draft' || status === 'pending' || status === 'approved' || status === 'rejected'
}

export function hasCreatorAccess(profile?: Pick<User, 'role' | 'kycStatus'> | null, kycStatus?: unknown) {
  const role = normalizeUserRole(profile?.role)
  return role === 'admin' || role === 'creator' || hasCreatorKycStatus(profile?.kycStatus) || hasCreatorKycStatus(kycStatus)
}
