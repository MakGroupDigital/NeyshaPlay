import { NextResponse } from 'next/server'
import { creditWalletDeposit, MIN_WALLET_DEPOSIT_USD } from '@/lib/wallet-transactions'

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

export async function POST(request: Request) {
  try {
    const { userId, orderId } = await request.json()
    if (!userId || !orderId) {
      return NextResponse.json({ error: 'userId et orderId sont requis' }, { status: 400 })
    }

    const accessToken = await getAccessToken()
    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    if (!response.ok || data?.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Capture PayPal echouee', details: data }, { status: 500 })
    }

    const capturedAmount = Number(data?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0)
    if (!Number.isFinite(capturedAmount) || capturedAmount < MIN_WALLET_DEPOSIT_USD) {
      return NextResponse.json({ error: 'Montant PayPal invalide' }, { status: 400 })
    }

    const result = await creditWalletDeposit({
      userId,
      amount: capturedAmount,
      method: 'paypal',
      providerReference: orderId,
      providerPayload: data,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur validation PayPal' }, { status: 500 })
  }
}
