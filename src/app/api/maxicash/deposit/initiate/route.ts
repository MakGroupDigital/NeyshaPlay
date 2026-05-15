import { NextResponse } from 'next/server'
import {
  createMaxiCashDirectPayment,
  generateMaxiCashReference,
  getMaxiCashConfig,
  getMaxiCashOperator,
  normalizeMaxiCashCurrency,
  normalizeMaxiCashPhone,
} from '@/lib/maxicash'
import { createPendingMaxiCashDeposit, finalizeMaxiCashDeposit } from '@/lib/maxicash-deposit'
import { MIN_WALLET_DEPOSIT_USD } from '@/lib/wallet-transactions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, amount, phoneNumber, operator, currency = 'USD' } = await request.json()
    const numericAmount = Number(amount)

    if (!userId || !Number.isFinite(numericAmount) || numericAmount < MIN_WALLET_DEPOSIT_USD) {
      return NextResponse.json(
        { error: `Le depot minimum est de ${MIN_WALLET_DEPOSIT_USD} USD.` },
        { status: 400 }
      )
    }

    const telephone = normalizeMaxiCashPhone(phoneNumber || '')
    if (!telephone) {
      return NextResponse.json({ error: 'Numero Mobile Money requis.' }, { status: 400 })
    }
    if (!operator) {
      return NextResponse.json({ error: 'Operateur Mobile Money requis.' }, { status: 400 })
    }

    const config = getMaxiCashConfig()
    if (!config.merchantId || !config.merchantPassword) {
      return NextResponse.json(
        { error: 'Configuration depot Mobile Money manquante.' },
        { status: 500 }
      )
    }

    const selectedOperator = getMaxiCashOperator(operator)
    if (selectedOperator.id === 'maxicash') {
      return NextResponse.json({ error: 'Choisissez Airtel Money, M-Pesa, Orange Money ou Afrimoney.' }, { status: 400 })
    }
    const paymentCurrency = normalizeMaxiCashCurrency(currency)
    const transactionId = `deposit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const reference = generateMaxiCashReference('NYP-DEP')
    const payment = await createMaxiCashDirectPayment({
      amount: numericAmount,
      currency: paymentCurrency,
      phoneNumber: telephone,
      reference,
      payType: selectedOperator.payType,
    })

    await createPendingMaxiCashDeposit({
      userId,
      transactionId,
      amount: numericAmount,
      reference,
      logId: payment.data?.TransactionID || payment.data?.ResponseData || '',
      phoneNumber: telephone,
      operator: selectedOperator.id,
      currency: paymentCurrency,
      providerPayload: payment.data,
    })

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
        transactionId,
        reference,
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

      return NextResponse.json(
        {
          success: false,
          status: 'failed',
          transactionId,
          reference,
          error: payment.message || 'Paiement Mobile Money non abouti.',
          providerPayload: payment.data,
        },
        { status: 402 }
      )
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      transactionId,
      reference,
      message: payment.message || 'Confirmez le paiement sur votre telephone.',
      providerPayload: payment.data,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur Mobile Money' }, { status: 500 })
  }
}
