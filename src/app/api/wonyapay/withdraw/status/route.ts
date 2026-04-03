import { NextResponse } from 'next/server'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getServerFirestore, getWalletRefByUserId } from '@/lib/firebase-server'
import {
  getWonyaFailureReason,
  getWonyaMessage,
  getWonyaPayConfig,
  getWonyaStatus,
  isCompletedWonyaStatus,
  isFailedWonyaStatus,
} from '@/lib/wonyapay'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, transactionId } = await request.json()
    if (!userId || !transactionId) {
      return NextResponse.json({ error: 'userId et transactionId sont requis' }, { status: 400 })
    }

    const config = getWonyaPayConfig()
    if (!config.token || !config.refPartenaire) {
      return NextResponse.json(
        { error: 'Configuration WonyaPay manquante. Vérifiez WONYAPAY_TOKEN et WONYAPAY_REF_PARTENAIRE.' },
        { status: 500 }
      )
    }

    const firestore = getServerFirestore()
    const walletRef = await getWalletRefByUserId(userId)
    const walletSnap = await getDoc(walletRef)

    if (!walletSnap.exists()) {
      return NextResponse.json({ error: 'Portefeuille introuvable' }, { status: 404 })
    }

    const wallet = walletSnap.data() as any
    const transactions = Array.isArray(wallet.transactions) ? [...wallet.transactions] : []
    const txIndex = transactions.findIndex((tx: any) => tx.id === transactionId)

    if (txIndex === -1) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    }

    const transaction = transactions[txIndex]
    if (transaction.status === 'completed' || transaction.status === 'failed') {
      return NextResponse.json({
        success: true,
        transactionStatus: transaction.status,
        newBalance: wallet.balance || 0,
        message: transaction.description,
      })
    }

    const refTransa = transaction?.metadata?.providerReference
    if (!refTransa) {
      return NextResponse.json({ error: 'Reference WonyaPay introuvable' }, { status: 400 })
    }

    const statusResponse = await fetch(`${config.baseUrl}/transactionStatus/status/${encodeURIComponent(refTransa)}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    })

    let statusPayload: any = null
    try {
      statusPayload = await statusResponse.json()
    } catch {
      statusPayload = null
    }

    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: getWonyaMessage(statusPayload) || `Erreur WonyaPay (${statusResponse.status})` },
        { status: statusResponse.status }
      )
    }

    const providerStatus = getWonyaStatus(statusPayload) || 'pending'
    let nextBalance = Number(wallet.balance || 0)

    if (isCompletedWonyaStatus(providerStatus)) {
      transactions[txIndex] = {
        ...transaction,
        status: 'completed',
        description: 'Retrait WonyaPay confirme',
        metadata: {
          ...transaction.metadata,
          providerStatus,
        },
      }

      await updateDoc(walletRef, {
        transactions,
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        transactionStatus: 'completed',
        newBalance: nextBalance,
        message: 'Retrait confirme',
      })
    }

    if (isFailedWonyaStatus(providerStatus)) {
      const alreadyRefunded = Boolean(transaction?.metadata?.refunded)
      if (!alreadyRefunded) {
        nextBalance += Number(transaction.amount || 0)
      }

      transactions[txIndex] = {
        ...transaction,
        status: 'failed',
        description: `Retrait echoue: ${getWonyaFailureReason(statusPayload)}`,
        metadata: {
          ...transaction.metadata,
          providerStatus,
          refunded: true,
        },
      }

      await updateDoc(walletRef, {
        balance: nextBalance,
        transactions,
        updatedAt: serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        transactionStatus: 'failed',
        newBalance: nextBalance,
        message: getWonyaFailureReason(statusPayload),
      })
    }

    transactions[txIndex] = {
      ...transaction,
      metadata: {
        ...transaction.metadata,
        providerStatus,
      },
    }

    await updateDoc(walletRef, {
      transactions,
      updatedAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      transactionStatus: 'pending',
      newBalance: nextBalance,
      message: getWonyaMessage(statusPayload),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
  }
}
