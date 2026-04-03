import { NextResponse } from 'next/server'
import { arrayUnion, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getWalletRefByUserId } from '@/lib/firebase-server'
import {
  generateWonyaRefTransa,
  getWonyaMessage,
  getWonyaPayConfig,
  getWonyaStatus,
  isCompletedWonyaStatus,
  normalizeWonyaPhoneNumber,
} from '@/lib/wonyapay'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, amount, phoneNumber } = await request.json()
    const numericAmount = Number(amount)
    if (!userId || !phoneNumber || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'userId, amount et phoneNumber sont requis' }, { status: 400 })
    }

    const config = getWonyaPayConfig()
    if (!config.token || !config.refPartenaire) {
      return NextResponse.json(
        { error: 'Configuration WonyaPay manquante. Vérifiez WONYAPAY_TOKEN et WONYAPAY_REF_PARTENAIRE.' },
        { status: 500 }
      )
    }

    const mobileMoney = normalizeWonyaPhoneNumber(phoneNumber)
    if (!/^\d{10}$/.test(mobileMoney)) {
      return NextResponse.json(
        { error: 'Le numero Mobile Money doit contenir 10 chiffres (ex: 0997654321).' },
        { status: 400 }
      )
    }

    const walletRef = await getWalletRefByUserId(userId)
    const walletSnap = await getDoc(walletRef)

    if (!walletSnap.exists()) {
      return NextResponse.json({ error: 'Portefeuille introuvable' }, { status: 404 })
    }

    const wallet = walletSnap.data() as any
    const balance = Number(wallet.balance || 0)
    if (balance < numericAmount) {
      return NextResponse.json({ error: 'Solde insuffisant pour effectuer ce retrait' }, { status: 400 })
    }

    const refTransa = generateWonyaRefTransa('WDR')
    const transactionId = `withdraw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const wonyaPayload = {
      RefPartenaire: config.refPartenaire,
      RefTransa: refTransa,
      Montant: numericAmount,
      Devise: 'USD',
      Action: 'B2C',
      MobileMoney: mobileMoney,
      Motif: 'Retrait NeyshaPay',
    }

    const wonyaResponse = await fetch(`${config.baseUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(wonyaPayload),
    })

    let wonyaResult: any = null
    try {
      wonyaResult = await wonyaResponse.json()
    } catch {
      wonyaResult = null
    }

    if (!wonyaResponse.ok) {
      return NextResponse.json(
        { error: getWonyaMessage(wonyaResult) || `Erreur WonyaPay (${wonyaResponse.status})` },
        { status: wonyaResponse.status }
      )
    }

    const providerStatus = getWonyaStatus(wonyaResult) || 'pending'
    const completed = isCompletedWonyaStatus(providerStatus)
    const nextBalance = balance - numericAmount
    const transaction = {
      id: transactionId,
      walletId: walletRef.id,
      type: 'withdrawal',
      amount: numericAmount,
      currency: 'USD',
      description: completed ? 'Retrait WonyaPay confirme' : 'Retrait WonyaPay en attente',
      status: completed ? 'completed' : 'pending',
      createdAt: new Date(),
      metadata: {
        withdrawalMethod: 'wonyapay',
        providerReference: refTransa,
        phoneNumber: mobileMoney,
        refunded: false,
      },
    }

    await updateDoc(walletRef, {
      balance: nextBalance,
      updatedAt: serverTimestamp(),
      transactions: arrayUnion(transaction),
    })

    return NextResponse.json({
      success: true,
      transactionId,
      newBalance: nextBalance,
      transactionStatus: completed ? 'completed' : 'pending',
      message: getWonyaMessage(wonyaResult),
      providerReference: refTransa,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
  }
}
