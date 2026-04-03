export type WonyaStatusPayload = {
  message?: string
  error?: string
  status?: string
  StatutWonya?: string
  StatutTransa?: string
  RefTransa?: string
  Motif?: string
  data?: {
    message?: string
    error?: string
    status?: string
    StatutWonya?: string
    StatutTransa?: string
    RefTransa?: string
    transactionId?: string
    network?: string
    Motif?: string
  }
}

export function getWonyaPayConfig() {
  return {
    baseUrl: (process.env.WONYAPAY_BASE_URL || 'https://app-api.wonyasoft.com').trim(),
    token: (process.env.WONYAPAY_TOKEN || '').trim(),
    refPartenaire: (process.env.WONYAPAY_REF_PARTENAIRE || '').trim(),
  }
}

export function normalizeWonyaPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '')

  if (digits.length === 10) return digits
  if (digits.length === 9) return `0${digits}`
  if (digits.length === 12 && digits.startsWith('243')) return `0${digits.slice(3)}`
  if (digits.length === 13 && digits.startsWith('2430')) return digits.slice(3)
  if (digits.length > 10) return digits.slice(-10)

  return digits
}

export function generateWonyaRefTransa(prefix = '') {
  const normalizedPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  const seed = `${normalizedPrefix}${Date.now()}${Math.random().toString(36).slice(2)}`
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return seed.slice(0, 20).padEnd(20, '0')
}

export function getWonyaStatus(payload: WonyaStatusPayload | null | undefined) {
  return (
    payload?.StatutWonya ||
    payload?.data?.StatutWonya ||
    payload?.status ||
    payload?.data?.status ||
    ''
  )
}

export function getWonyaMessage(payload: WonyaStatusPayload | null | undefined) {
  return (
    payload?.message ||
    payload?.data?.message ||
    payload?.error ||
    payload?.data?.error ||
    'Operation WonyaPay'
  )
}

export function getWonyaFailureReason(payload: WonyaStatusPayload | null | undefined) {
  return payload?.Motif || payload?.data?.Motif || getWonyaMessage(payload)
}

export function isCompletedWonyaStatus(status: string | undefined) {
  return ['succes', 'recu', 'reçu', 'completed', 'success', 'successful', 'paid', 'confirmed'].includes(
    (status || '').toLowerCase()
  )
}

export function isFailedWonyaStatus(status: string | undefined) {
  return ['echec', 'échec', 'failed', 'error', 'erreur', 'cancelled', 'canceled'].includes(
    (status || '').toLowerCase()
  )
}
