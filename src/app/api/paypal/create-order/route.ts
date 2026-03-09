import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'

const PAYPAL_BASE =
  PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

async function getAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials missing')
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const raw = await response.text()
  let data: any = null
  try {
    data = JSON.parse(raw)
  } catch {
    data = null
  }
  if (!response.ok || !data?.access_token) {
    const detail = data?.error_description || data?.error || raw || 'Unknown error'
    throw new Error(`PayPal auth failed: ${detail}`)
  }
  return data.access_token as string
}

export async function POST(request: Request) {
  try {
    const { amount, currency, videoId } = await request.json()
    const numericAmount = Number(amount)
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 })
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const forwardedHost = request.headers.get('x-forwarded-host')
    const host = forwardedHost || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const origin = host ? `${proto}://${host}` : 'http://localhost:3000'
    const returnUrl = `${origin}/paypal/return?videoId=${encodeURIComponent(videoId || '')}`
    const cancelUrl = `${origin}/paypal/cancel?videoId=${encodeURIComponent(videoId || '')}`

    const accessToken = await getAccessToken()
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency || 'USD',
              value: numericAmount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          user_action: 'PAY_NOW',
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: 'PayPal order failed', details: data }, { status: 500 })
    }

    const approveUrl = data?.links?.find((link: any) => link.rel === 'approve')?.href
    return NextResponse.json({
      orderId: data.id,
      approveUrl,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
