export type MaxiCashConfig = {
  merchantId: string
  merchantPassword: string
  env: 'sandbox' | 'live'
  currency: 'maxiDollar' | 'maxiRand' | 'USD' | 'ZAR' | 'FC'
  payEntryWebUrl: string
  gatewayWebUrl: string
}

export function getMaxiCashConfig(): MaxiCashConfig {
  const env = process.env.MAXICASH_ENV === 'live' ? 'live' : 'sandbox'
  const merchantId = process.env.MAXICASH_MERCHANT_ID || ''
  const merchantPassword = process.env.MAXICASH_MERCHANT_PASSWORD || ''
  const currency = (process.env.MAXICASH_CURRENCY || 'maxiDollar') as MaxiCashConfig['currency']

  return {
    env,
    merchantId,
    merchantPassword,
    currency,
    payEntryWebUrl:
      env === 'live'
        ? 'https://webapi.maxicashapp.com/Integration/PayEntryWeb'
        : 'https://webapi-test.maxicashapp.com/Integration/PayEntryWeb',
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

export function toMaxiCashAmount(amount: number, currency: MaxiCashConfig['currency']) {
  return currency === 'FC' ? Math.round(amount).toString() : Math.round(amount * 100).toString()
}

export function generateMaxiCashReference() {
  return `NYD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function createMaxiCashGatewaySession(payload: Record<string, string>) {
  const config = getMaxiCashConfig()
  const response = await fetch(config.payEntryWebUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const raw = await response.text()
  let data: any = null
  try {
    data = JSON.parse(raw)
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.ResponseError || raw || `Erreur MaxiCash (${response.status})`)
  }

  const logId = data?.LogID || data?.ResponseData
  if (data?.ResponseStatus && data.ResponseStatus !== 'success') {
    throw new Error(data?.ResponseError || data?.ResponseDesc || 'MaxiCash a refuse la transaction')
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
