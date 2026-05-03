import { NextResponse } from 'next/server'
import { MIN_WALLET_DEPOSIT_USD } from '@/lib/wallet-transactions'

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
  const data = await response.json()
  if (!response.ok || !data?.access_token) {
    throw new Error(data?.error_description || data?.error || 'PayPal auth failed')
  }
  return data.access_token as string
}

function getOrigin(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https')
  return host ? `${proto}://${host}` : 'http://localhost:9002'
}

export async function POST(request: Request) {
  try {
    const { userId, amount } = await request.json()
    const numericAmount = Number(amount)
    if (!userId || !Number.isFinite(numericAmount) || numericAmount < MIN_WALLET_DEPOSIT_USD) {
      return NextResponse.json(
        { error: `Le depot minimum est de ${MIN_WALLET_DEPOSIT_USD} USD.` },
        { status: 400 }
      )
    }

    const origin = getOrigin(request)
    const params = new URLSearchParams({ userId, amount: numericAmount.toFixed(2) })
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
              currency_code: 'USD',
              value: numericAmount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: `${origin}/paypal/deposit/return?${params.toString()}`,
          cancel_url: `${origin}/paypal/deposit/cancel`,
          user_action: 'PAY_NOW',
        },
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: 'PayPal order failed', details: data }, { status: 500 })
    }

    const approveUrl = data?.links?.find((link: any) => link.rel === 'approve')?.href
    return NextResponse.json({ orderId: data.id, approveUrl, redirectUrl: approveUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur depot PayPal' }, { status: 500 })
  }
}
