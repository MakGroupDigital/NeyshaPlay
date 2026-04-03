import { NextResponse } from 'next/server'
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getServerFirestore, getWalletRefByUserId } from '@/lib/firebase-server'
import {
  generateWonyaRefTransa,
  getWonyaMessage,
  getWonyaPayConfig,
  getWonyaStatus,
  isCompletedWonyaStatus,
  normalizeWonyaPhoneNumber,
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
    const { userId, videoId, phoneNumber } = await request.json()
    if (!userId || !videoId || !phoneNumber) {
      return NextResponse.json({ error: 'userId, videoId et phoneNumber sont requis' }, { status: 400 })
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

    const firestore = getServerFirestore()
    const videoRef = doc(firestore, 'videos', videoId)
    const videoSnap = await getDoc(videoRef)

    if (!videoSnap.exists()) {
      return NextResponse.json({ error: 'Contenu introuvable' }, { status: 404 })
    }

    const videoData = videoSnap.data() as any
    const amount = Number(videoData.price || 0)
    const currency = (videoData.currency || 'USD').toUpperCase()
    const creatorId = videoData?.userRef?.id || videoData?.user?.id || null

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Ce contenu n’est pas payable.' }, { status: 400 })
    }

    const existingPurchaseQuery = query(
      collection(firestore, 'purchases'),
      where('userId', '==', userId),
      where('videoId', '==', videoId),
      where('status', '==', 'completed'),
      limit(1)
    )
    const existingPurchaseSnapshot = await getDocs(existingPurchaseQuery)
    if (!existingPurchaseSnapshot.empty) {
      return NextResponse.json({
        success: true,
        purchaseId: existingPurchaseSnapshot.docs[0].id,
        transactionStatus: 'completed',
        message: 'Contenu deja debloque',
      })
    }

    const purchaseRef = doc(collection(firestore, 'purchases'))
    const refTransa = generateWonyaRefTransa('BUY')
    const wonyaPayload = {
      RefPartenaire: config.refPartenaire,
      RefTransa: refTransa,
      Montant: amount,
      Devise: currency === 'CDF' ? 'CDF' : 'USD',
      Action: 'C2B',
      MobileMoney: mobileMoney,
      Motif: `Achat contenu NeyshaPay ${videoId}`,
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

    await setDoc(purchaseRef, {
      userId,
      videoId,
      creatorId,
      amount,
      currency: currency === 'CDF' ? 'CDF' : 'USD',
      method: 'wonyapay',
      status: completed ? 'completed' : 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      wonyaPay: {
        refTransa,
        providerStatus,
        phoneNumber: mobileMoney,
        transactionId: wonyaResult?.data?.transactionId || null,
        network: wonyaResult?.data?.network || null,
        rawResponse: wonyaResult,
      },
    })

    if (completed && creatorId && creatorId !== userId) {
      await creditCreatorWallet({
        creatorId,
        amount,
        currency,
        videoId,
        purchaseId: purchaseRef.id,
      })
      await updateDoc(purchaseRef, {
        settledAt: serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      purchaseId: purchaseRef.id,
      transactionStatus: completed ? 'completed' : 'pending',
      message: getWonyaMessage(wonyaResult),
      providerReference: refTransa,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 })
  }
}
