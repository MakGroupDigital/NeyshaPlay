import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getServerFirestore, getWalletRefByUserId } from '@/lib/firebase-server'

export const MIN_WALLET_DEPOSIT_USD = 10

export async function creditWalletDeposit(input: {
  userId: string
  amount: number
  method: 'paypal' | 'maxicash'
  providerReference: string
  providerPayload?: Record<string, any> | null
}) {
  const walletRef = await getWalletRefByUserId(input.userId)
  const walletSnap = await getDoc(walletRef)
  const transactionId = `deposit_${input.method}_${input.providerReference}`
  const transaction = {
    id: transactionId,
    walletId: walletRef.id,
    type: 'credit',
    amount: input.amount,
    currency: 'USD',
    description: `Depot ${input.method === 'paypal' ? 'PayPal' : 'Mobile Money'} confirme`,
    status: 'completed',
    createdAt: new Date(),
    metadata: {
      depositMethod: input.method,
      providerReference: input.providerReference,
      providerPayload: input.providerPayload || null,
    },
  }

  if (walletSnap.exists()) {
    const wallet = walletSnap.data() as any
    const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : []
    const alreadyCredited = transactions.some((item: any) => item?.id === transactionId)
    if (alreadyCredited) {
      return {
        alreadyProcessed: true,
        newBalance: Number(wallet.balance || 0),
      }
    }

    const nextBalance = Number(wallet.balance || 0) + input.amount
    await updateDoc(walletRef, {
      userId: input.userId,
      balance: nextBalance,
      currency: 'USD',
      updatedAt: serverTimestamp(),
      transactions: arrayUnion(transaction),
    })
    return { alreadyProcessed: false, newBalance: nextBalance }
  }

  await setDoc(walletRef, {
    userId: input.userId,
    balance: input.amount,
    currency: 'USD',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    transactions: [transaction],
  })

  return { alreadyProcessed: false, newBalance: input.amount }
}

export async function purchaseVideoWithWallet(input: { userId: string; videoId: string }) {
  const firestore = getServerFirestore()
  const videoRef = doc(firestore, 'videos', input.videoId)
  const videoSnap = await getDoc(videoRef)

  if (!videoSnap.exists()) {
    throw new Error('Contenu introuvable')
  }

  const video = videoSnap.data() as any
  const amount = Number(video.price || 0)
  const currency = video.currency || 'USD'
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Ce contenu n est pas payant')
  }
  if (currency !== 'USD') {
    throw new Error('Le portefeuille prend uniquement en charge les achats en USD')
  }

  const creatorId = (video.userRef as any)?.id || video.userId || null
  if (creatorId && creatorId === input.userId) {
    return { alreadyPurchased: true, balance: null, amount }
  }

  const existingQuery = query(
    collection(firestore, 'purchases'),
    where('userId', '==', input.userId),
    where('videoId', '==', input.videoId),
    limit(1)
  )
  const existingSnapshot = await getDocs(existingQuery)
  if (!existingSnapshot.empty) {
    return { alreadyPurchased: true, balance: null, amount }
  }

  const buyerWalletRef = await getWalletRefByUserId(input.userId)
  const buyerWalletSnap = await getDoc(buyerWalletRef)
  const buyerWallet = buyerWalletSnap.exists() ? (buyerWalletSnap.data() as any) : null
  const buyerBalance = Number(buyerWallet?.balance || 0)
  if (!buyerWalletSnap.exists() || buyerBalance < amount) {
    return {
      insufficientFunds: true,
      balance: buyerBalance,
      amount,
      missingAmount: Math.max(0, amount - buyerBalance),
    }
  }

  const purchaseRef = doc(collection(firestore, 'purchases'))
  const purchaseId = purchaseRef.id
  const buyerTransactions = Array.isArray(buyerWallet?.transactions) ? buyerWallet.transactions : []
  const debitTransaction = {
    id: `purchase_${purchaseId}`,
    walletId: buyerWalletRef.id,
    type: 'debit',
    amount,
    currency: 'USD',
    description: 'Achat de contenu payant',
    status: 'completed',
    createdAt: new Date(),
    metadata: {
      videoId: input.videoId,
      orderId: purchaseId,
    },
  }

  const batch = writeBatch(firestore)
  batch.set(purchaseRef, {
    userId: input.userId,
    videoId: input.videoId,
    creatorId,
    amount,
    currency: 'USD',
    method: 'wallet',
    status: 'completed',
    createdAt: serverTimestamp(),
    settledAt: serverTimestamp(),
  })
  batch.update(buyerWalletRef, {
    balance: buyerBalance - amount,
    currency: 'USD',
    userId: input.userId,
    updatedAt: serverTimestamp(),
    transactions: [...buyerTransactions, debitTransaction],
  })

  if (creatorId) {
    const creatorWalletRef = await getWalletRefByUserId(creatorId)
    const creatorWalletSnap = await getDoc(creatorWalletRef)
    const earningTransaction = {
      id: `earning_${purchaseId}`,
      walletId: creatorWalletRef.id,
      type: 'earning',
      amount,
      currency: 'USD',
      description: 'Vente de contenu payant',
      status: 'completed',
      createdAt: new Date(),
      metadata: {
        videoId: input.videoId,
        orderId: purchaseId,
      },
    }

    if (creatorWalletSnap.exists()) {
      const creatorWallet = creatorWalletSnap.data() as any
      const creatorTransactions = Array.isArray(creatorWallet.transactions) ? creatorWallet.transactions : []
      batch.update(creatorWalletRef, {
        balance: Number(creatorWallet.balance || 0) + amount,
        currency: 'USD',
        userId: creatorId,
        updatedAt: serverTimestamp(),
        transactions: [...creatorTransactions, earningTransaction],
      })
    } else {
      batch.set(creatorWalletRef, {
        userId: creatorId,
        balance: amount,
        currency: 'USD',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        transactions: [earningTransaction],
      })
    }

    batch.set(doc(collection(firestore, 'notifications')), {
      recipientId: creatorId,
      actorId: input.userId,
      actor: null,
      type: 'purchase',
      content: 'Votre contenu payant a été débloqué.',
      read: false,
      metadata: {
        videoId: input.videoId,
        purchaseId,
        amount,
      },
      createdAt: serverTimestamp(),
    })
  }

  await batch.commit()

  return {
    success: true,
    purchaseId,
    amount,
    balance: buyerBalance - amount,
  }
}
