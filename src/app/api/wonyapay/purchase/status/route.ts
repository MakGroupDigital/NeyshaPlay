import { NextResponse } from 'next/server'
import { arrayUnion, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
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

async function creditCreatorWallet(params: {
  creatorId: string
  amount: number
  currency: string
  videoId: string
  purchaseId: string
}) {
  const { creatorId, amount, currency, videoId, purchaseId } = params
  const firestore = getServerFirestore()
  const walletRef = await getWalletRefByUserId(creatorId)
  const walletSnap = await getDoc(walletRef)
  const transaction = {
    id: `earning_${purchaseId}`,
    walletId: creatorId,
    type: 'earning',
    amount,
    currency: currency === 'CDF' ? 'CDF' : 'USD',
    description: 'Achat de contenu confirme',
    status: 'completed',
    createdAt: new Date(),
    metadata: {
      videoId,
      orderId: purchaseId,
      withdrawalMethod: 'wonyapay',
    },
  }

  if (walletSnap.exists()) {
    await updateDoc(walletRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
      transactions: arrayUnion(transaction),
    })
    return
  }

  await setDoc(walletRef, {
    userId: creatorId,
    balance: amount,
    currency: currency === 'CDF' ? 'CDF' : 'USD',
    transactions: [transaction],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function POST(request: Request) {
  try {
    const { purchaseId } = await request.json()
    if (!purchaseId) {
      return NextResponse.json({ error: 'purchaseId requis' }, { status: 400 })
    }

    const config = getWonyaPayConfig()
    if (!config.token || !config.refPartenaire) {
      return NextResponse.json(
        { error: 'Configuration WonyaPay manquante. Vérifiez WONYAPAY_TOKEN et WONYAPAY_REF_PARTENAIRE.' },
        { status: 500 }
      )
    }

    const firestore = getServerFirestore()
    const purchaseRef = doc(firestore, 'purchases', purchaseId)
    const purchaseSnap = await getDoc(purchaseRef)

    if (!purchaseSnap.exists()) {
      return NextResponse.json({ error: 'Achat introuvable' }, { status: 404 })
    }

    const purchase = purchaseSnap.data() as any
    if (purchase.status === 'completed' || purchase.status === 'failed') {
      return NextResponse.json({
        success: true,
        transactionStatus: purchase.status,
        message: purchase.status === 'completed' ? 'Contenu debloque' : 'Paiement echoue',
      })
    }

    const refTransa = purchase?.wonyaPay?.refTransa
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

    if (isCompletedWonyaStatus(providerStatus)) {
      if (!purchase.settledAt && purchase.creatorId && purchase.creatorId !== purchase.userId) {
        await creditCreatorWallet({
          creatorId: purchase.creatorId,
          amount: Number(purchase.amount || 0),
          currency: purchase.currency || 'USD',
          videoId: purchase.videoId,
          purchaseId,
        })
      }

      await updateDoc(purchaseRef, {
        status: 'completed',
        updatedAt: serverTimestamp(),
        settledAt: serverTimestamp(),
        'wonyaPay.providerStatus': providerStatus,
        'wonyaPay.statusResponse': statusPayload,
      })

      return NextResponse.json({
        success: true,
        transactionStatus: 'completed',
        message: 'Contenu debloque',
      })
    }

    if (isFailedWonyaStatus(providerStatus)) {
      await updateDoc(purchaseRef, {
        status: 'failed',
        updatedAt: serverTimestamp(),
        failedAt: serverTimestamp(),
        failureReason: getWonyaFailureReason(statusPayload),
        'wonyaPay.providerStatus': providerStatus,
        'wonyaPay.statusResponse': statusPayload,
      })

      return NextResponse.json({
        success: true,
        transactionStatus: 'failed',
        message: getWonyaFailureReason(statusPayload),
      })
    }

    await updateDoc(purchaseRef, {
      updatedAt: serverTimestamp(),
      'wonyaPay.providerStatus': providerStatus,
      'wonyaPay.statusResponse': statusPayload,
    })

    return NextResponse.json({
      success: true,
      transactionStatus: 'pending',
      message: getWonyaMessage(statusPayload),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
  }
}
