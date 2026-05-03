import { NextResponse } from 'next/server'
import {
  createMaxiCashGatewaySession,
  generateMaxiCashReference,
  getMaxiCashConfig,
  getRequestOrigin,
  toMaxiCashAmount,
} from '@/lib/maxicash'
import { createPendingMaxiCashDeposit } from '@/lib/maxicash-deposit'
import { MIN_WALLET_DEPOSIT_USD } from '@/lib/wallet-transactions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, amount, phoneNumber, email } = await request.json()
    const numericAmount = Number(amount)

    if (!userId || !Number.isFinite(numericAmount) || numericAmount < MIN_WALLET_DEPOSIT_USD) {
      return NextResponse.json(
        { error: `Le depot minimum est de ${MIN_WALLET_DEPOSIT_USD} USD.` },
        { status: 400 }
      )
    }

    const config = getMaxiCashConfig()
    if (!config.merchantId || !config.merchantPassword) {
      return NextResponse.json(
        { error: 'Configuration depot Mobile Money manquante.' },
        { status: 500 }
      )
    }

    const origin = getRequestOrigin(request)
    const transactionId = `deposit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const reference = generateMaxiCashReference()
    const urlParams = new URLSearchParams({ userId, transactionId, reference })
    const successUrl = `${origin}/maxicash/return?${urlParams.toString()}`
    const cancelUrl = `${origin}/maxicash/cancel?${urlParams.toString()}`
    const failureUrl = `${origin}/maxicash/return?${urlParams.toString()}&result=failed`
    const notifyUrl = `${origin}/api/maxicash/deposit/notify?${urlParams.toString()}`

    const session = await createMaxiCashGatewaySession({
      PayType: 'MaxiCash',
      MerchantID: config.merchantId,
      MerchantPassword: config.merchantPassword,
      Amount: toMaxiCashAmount(numericAmount, config.currency),
      Currency: config.currency,
      Telephone: phoneNumber || '',
      Email: email || '',
      Language: 'fr',
      Reference: reference,
      SuccessURL: successUrl,
      FailureURL: failureUrl,
      CancelURL: cancelUrl,
      NotifyURL: notifyUrl,
    })

    await createPendingMaxiCashDeposit({
      userId,
      transactionId,
      amount: numericAmount,
      reference,
      logId: session.logId,
      phoneNumber,
      email,
    })

    return NextResponse.json({
      success: true,
      transactionId,
      reference,
      redirectUrl: session.redirectUrl,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur Mobile Money' }, { status: 500 })
  }
}
