export type MaxiCashCurrency = 'USD' | 'CDF'

export type MaxiCashConfig = {
  merchantId: string
  merchantPassword: string
  env: 'sandbox' | 'live'
  payNowSyncUrl: string
  checkPaymentStatusByReferenceUrl: string
  payEntryWebUrl: string
  gatewayWebUrl: string
}

export type MaxiCashOperator = {
  id: 'maxicash' | 'airtel' | 'mpesa' | 'orange' | 'africell'
  label: string
  payType: number
}

export const MAXICASH_OPERATORS: MaxiCashOperator[] = [
  { id: 'maxicash', label: 'MaxiCash', payType: 0 },
  { id: 'airtel', label: 'Airtel Money', payType: 1 },
  { id: 'mpesa', label: 'M-Pesa', payType: 2 },
  { id: 'orange', label: 'Orange Money', payType: 3 },
  { id: 'africell', label: 'Afrimoney', payType: 4 },
]

export function getMaxiCashConfig(): MaxiCashConfig {
  const env = process.env.MAXICASH_ENV === 'live' ? 'live' : 'sandbox'
  const merchantId = process.env.MAXICASH_MERCHANT_ID || ''
  const merchantPassword = process.env.MAXICASH_MERCHANT_PASSWORD || ''

  return {
    env,
    merchantId,
    merchantPassword,
    payNowSyncUrl:
      process.env.MAXICASH_PAY_NOW_SYNC_URL ||
      (env === 'live'
        ? 'https://webapi.maxicashapp.com/Integration/PayNowSync'
        : 'https://webapi-test.maxicashapp.com/Integration/PayNowSync'),
    checkPaymentStatusByReferenceUrl:
      process.env.MAXICASH_CHECK_PAYMENT_STATUS_BY_REFERENCE_URL ||
      (env === 'live'
        ? 'https://webapi.maxicashapp.com/Integration/CheckPaymentStatusByReference'
        : 'https://webapi-test.maxicashapp.com/Integration/CheckPaymentStatusByReference'),
    payEntryWebUrl:
      process.env.MAXICASH_PAY_ENTRY_WEB_URL ||
      (env === 'live'
        ? 'https://webapi.maxicashapp.com/Integration/PayEntryWeb'
        : 'https://webapi-test.maxicashapp.com/Integration/PayEntryWeb'),
    gatewayWebUrl:
      env === 'live'
        ? 'https://api.maxicashapp.com/payentryweb'
        : 'https://api-testbed.maxicashapp.com/payentryweb',
  }
}

export function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https')
  return host ? `${proto}://${host}` : 'http://localhost:9002'
}

export function getMaxiCashOperator(value?: string | number | null) {
  if (typeof value === 'number' || /^\d+$/.test(String(value || ''))) {
    const payType = Number(value)
    return MAXICASH_OPERATORS.find((operator) => operator.payType === payType) || MAXICASH_OPERATORS[0]
  }

  const normalized = String(value || '').toLowerCase()
  return (
    MAXICASH_OPERATORS.find((operator) => operator.id === normalized) ||
    MAXICASH_OPERATORS.find((operator) => operator.label.toLowerCase() === normalized) ||
    MAXICASH_OPERATORS[0]
  )
}

export function normalizeMaxiCashCurrency(value?: string | null): MaxiCashCurrency {
  return String(value || '').toUpperCase() === 'CDF' ? 'CDF' : 'USD'
}

export function normalizeMaxiCashPhone(phoneNumber: string) {
  let digits = String(phoneNumber || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `243${digits.slice(1)}`
  return digits
}

export function toMaxiCashAmount(amount: number) {
  return Math.round(Number(amount) * 100).toString()
}

export function generateMaxiCashReference(prefix = 'NYP') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function parseMaxiCashRawResponse(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return raw ? { ResponseStatus: 'Failed', ResponseError: raw } : null
  }
}

export function getMaxiCashResponseText(payload: any) {
  const candidates = [
    payload?.ResponseError,
    payload?.ResponseDesc,
    payload?.ResponseData,
    payload?.TransactionStatus,
    payload?.PaymentStatus,
    payload?.Status,
    payload?.status,
    payload?.message,
  ]
  return candidates.find((value) => typeof value === 'string' && value.trim()) || ''
}

export function hasCompletedMaxiCashPayment(payload: any) {
  const values = [
    payload?.ResponseData,
    payload?.TransactionStatus,
    payload?.PaymentStatus,
    payload?.Status,
    payload?.status,
    payload?.state,
    payload?.Result,
    payload?.result,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())

  return values.some((value) =>
    ['completed', 'complete', 'paid', 'approved', 'confirmed', 'success', 'successful', 'succeeded'].some((word) =>
      value.includes(word)
    )
  )
}

export function hasFailedMaxiCashPayment(payload: any) {
  const values = [
    payload?.ResponseStatus,
    payload?.ResponseError,
    payload?.ResponseData,
    payload?.TransactionStatus,
    payload?.PaymentStatus,
    payload?.Status,
    payload?.status,
    payload?.state,
    payload?.Result,
    payload?.result,
  ]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())

  return values.some((value) =>
    ['failed', 'failure', 'declined', 'cancelled', 'canceled', 'error', 'expired', 'timeout', 'rejected'].some((word) =>
      value.includes(word)
    )
  )
}

export function isMaxiCashRequestAccepted(payload: any) {
  return String(payload?.ResponseStatus || '').toLowerCase() === 'success'
}

export async function createMaxiCashDirectPayment(input: {
  amount: number
  currency?: MaxiCashCurrency
  phoneNumber: string
  reference: string
  payType: number
}) {
  const config = getMaxiCashConfig()
  if (!config.merchantId || !config.merchantPassword) {
    throw new Error('Configuration MaxiCash manquante.')
  }

  const telephone = normalizeMaxiCashPhone(input.phoneNumber)
  if (!telephone || telephone.length < 9) {
    throw new Error('Numero Mobile Money invalide.')
  }

  const payload = {
    RequestData: {
      Amount: toMaxiCashAmount(input.amount),
      Reference: input.reference,
      Telephone: telephone,
    },
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    PayType: Number(input.payType),
    CurrencyCode: normalizeMaxiCashCurrency(input.currency),
  }

  const response = await fetch(config.payNowSyncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  const data = parseMaxiCashRawResponse(raw)
  if (!response.ok) {
    throw new Error(getMaxiCashResponseText(data) || raw || `Erreur MaxiCash (${response.status})`)
  }

  return {
    payload,
    data,
    completed: hasCompletedMaxiCashPayment(data),
    failed: hasFailedMaxiCashPayment(data),
    accepted: isMaxiCashRequestAccepted(data),
    message: getMaxiCashResponseText(data),
  }
}

export async function checkMaxiCashPaymentStatusByReference(reference: string) {
  const config = getMaxiCashConfig()
  if (!config.merchantId || !config.merchantPassword) {
    throw new Error('Configuration MaxiCash manquante.')
  }

  const payload = {
    MerchantID: config.merchantId,
    MerchantPassword: config.merchantPassword,
    Reference: reference,
  }

  const postResponse = await fetch(config.checkPaymentStatusByReferenceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null)

  if (postResponse?.ok) {
    const data = parseMaxiCashRawResponse(await postResponse.text())
    return {
      data,
      completed: hasCompletedMaxiCashPayment(data),
      failed: hasFailedMaxiCashPayment(data),
      accepted: isMaxiCashRequestAccepted(data),
      message: getMaxiCashResponseText(data),
    }
  }

  const url = new URL(config.checkPaymentStatusByReferenceUrl)
  url.searchParams.set('MerchantID', config.merchantId)
  url.searchParams.set('MerchantPassword', config.merchantPassword)
  url.searchParams.set('Reference', reference)

  const response = await fetch(url.toString(), { method: 'GET' })
  const raw = await response.text()
  const data = parseMaxiCashRawResponse(raw)
  if (!response.ok) {
    throw new Error(getMaxiCashResponseText(data) || raw || `Verification MaxiCash impossible (${response.status})`)
  }

  return {
    data,
    completed: hasCompletedMaxiCashPayment(data),
    failed: hasFailedMaxiCashPayment(data),
    accepted: isMaxiCashRequestAccepted(data),
    message: getMaxiCashResponseText(data),
  }
}

export async function createMaxiCashGatewaySession(payload: Record<string, string>) {
  const config = getMaxiCashConfig()
  const response = await fetch(config.payEntryWebUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  const data = parseMaxiCashRawResponse(raw)
  if (!response.ok) {
    throw new Error(getMaxiCashResponseText(data) || raw || `Erreur MaxiCash (${response.status})`)
  }

  const logId = data?.LogID || data?.ResponseData
  if (data?.ResponseStatus && String(data.ResponseStatus).toLowerCase() !== 'success') {
    throw new Error(getMaxiCashResponseText(data) || 'MaxiCash a refuse la transaction')
  }
  if (!logId) {
    throw new Error('MaxiCash n a pas retourne de LogID')
  }

  return {
    logId: String(logId),
    redirectUrl: `${config.gatewayWebUrl}?logid=${encodeURIComponent(String(logId))}`,
    raw: data,
  }
}
