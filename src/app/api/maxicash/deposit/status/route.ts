import { NextResponse } from 'next/server'
import { checkMaxiCashPaymentStatusByReference } from '@/lib/maxicash'
import { finalizeMaxiCashDeposit } from '@/lib/maxicash-deposit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, transactionId, reference } = await request.json()
    if (!userId || !transactionId || !reference) {
      return NextResponse.json(
        { error: 'userId, transactionId et reference sont requis' },
        { status: 400 }
      )
    }

    const payment = await checkMaxiCashPaymentStatusByReference(reference)
    if (payment.completed) {
      const result = await finalizeMaxiCashDeposit({
        userId,
        transactionId,
        status: 'completed',
        providerPayload: payment.data,
      })
      return NextResponse.json({
        success: true,
        status: 'completed',
        newBalance: result.newBalance,
        providerPayload: payment.data,
      })
    }

    if (payment.failed) {
      await finalizeMaxiCashDeposit({
        userId,
        transactionId,
        status: 'failed',
        providerPayload: payment.data,
      })
      return NextResponse.json({
        success: false,
        status: 'failed',
        error: payment.message || 'Paiement Mobile Money non abouti.',
        providerPayload: payment.data,
      })
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: payment.message || 'Paiement en attente de confirmation.',
      providerPayload: payment.data,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Verification Mobile Money impossible' }, { status: 500 })
  }
}
