import { NextResponse } from 'next/server'
import { finalizeMaxiCashDeposit } from '@/lib/maxicash-deposit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, transactionId, status, providerPayload } = await request.json()
    if (!userId || !transactionId) {
      return NextResponse.json({ error: 'userId et transactionId sont requis' }, { status: 400 })
    }

    const normalizedStatus = status === 'cancelled' || status === 'failed' ? status : 'completed'
    const result = await finalizeMaxiCashDeposit({
      userId,
      transactionId,
      status: normalizedStatus,
      providerPayload,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur Mobile Money' }, { status: 500 })
  }
}
