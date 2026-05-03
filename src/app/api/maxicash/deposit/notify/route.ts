import { NextRequest, NextResponse } from 'next/server'
import { finalizeMaxiCashDeposit } from '@/lib/maxicash-deposit'

export const runtime = 'nodejs'

function statusFromPayload(payload: Record<string, any>) {
  const raw = String(
    payload.status ||
      payload.Status ||
      payload.TransactionStatus ||
      payload.ResponseStatus ||
      payload.result ||
      ''
  ).toLowerCase()

  if (raw.includes('cancel')) return 'cancelled'
  if (raw.includes('fail') || raw.includes('declin') || raw.includes('error')) return 'failed'
  return 'completed'
}

async function handleNotify(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('userId') || ''
  const transactionId = searchParams.get('transactionId') || ''
  const queryPayload = Object.fromEntries(searchParams.entries())
  let bodyPayload: Record<string, any> = {}

  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      bodyPayload = await request.json().catch(() => ({}))
    } else {
      const formData = await request.formData().catch(() => null)
      if (formData) bodyPayload = Object.fromEntries(formData.entries())
    }
  }

  if (!userId || !transactionId) {
    return NextResponse.json({ error: 'Parametres Mobile Money manquants' }, { status: 400 })
  }

  const providerPayload = { ...queryPayload, ...bodyPayload }
  const result = await finalizeMaxiCashDeposit({
    userId,
    transactionId,
    status: statusFromPayload(providerPayload),
    providerPayload,
  })

  return NextResponse.json({ success: true, ...result })
}

export async function GET(request: NextRequest) {
  try {
    return await handleNotify(request)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur notification Mobile Money' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleNotify(request)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur notification Mobile Money' }, { status: 500 })
  }
}
