import { arrayUnion, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { getWalletRefByUserId } from '@/lib/firebase-server'

type FinalizeMaxiCashDepositInput = {
  userId: string
  transactionId: string
  status: 'completed' | 'failed' | 'cancelled'
  providerPayload?: Record<string, any>
}

export async function finalizeMaxiCashDeposit({
  userId,
  transactionId,
  status,
  providerPayload,
}: FinalizeMaxiCashDepositInput) {
  const walletRef = await getWalletRefByUserId(userId)
  const walletSnap = await getDoc(walletRef)

  if (!walletSnap.exists()) {
    throw new Error('Portefeuille introuvable')
  }

  const wallet = walletSnap.data() as any
  const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : []
  const transactionIndex = transactions.findIndex((transaction: any) => transaction?.id === transactionId)

  if (transactionIndex === -1) {
    throw new Error('Transaction de depot introuvable')
  }

  const transaction = transactions[transactionIndex]
  if (transaction.status === 'completed') {
    return {
      alreadyProcessed: true,
      newBalance: Number(wallet.balance || 0),
      transactionStatus: transaction.status,
    }
  }

  if (transaction.status !== 'pending' && status !== 'completed') {
    return {
      alreadyProcessed: true,
      newBalance: Number(wallet.balance || 0),
      transactionStatus: transaction.status,
    }
  }

  const amount = Number(transaction.amount || 0)
  const nextTransactions = [...transactions]
  nextTransactions[transactionIndex] = {
    ...transaction,
    status,
    description:
      status === 'completed'
        ? 'Depot Mobile Money confirme'
        : status === 'cancelled'
          ? 'Depot Mobile Money annule'
          : 'Depot Mobile Money echoue',
    metadata: {
      ...(transaction.metadata || {}),
      providerStatus: status,
      providerPayload: providerPayload || null,
    },
  }

  const shouldCredit = status === 'completed' && transaction.status !== 'completed'
  const nextBalance = shouldCredit ? Number(wallet.balance || 0) + amount : Number(wallet.balance || 0)
  await updateDoc(walletRef, {
    balance: nextBalance,
    updatedAt: serverTimestamp(),
    transactions: nextTransactions,
  })

  return {
    alreadyProcessed: false,
    newBalance: nextBalance,
    transactionStatus: status,
  }
}

export async function createPendingMaxiCashDeposit(input: {
  userId: string
  transactionId: string
  amount: number
  reference: string
  logId?: string
  phoneNumber?: string
  email?: string
  operator?: string
  currency?: string
  providerPayload?: Record<string, any> | null
}) {
  const walletRef = await getWalletRefByUserId(input.userId)
  const walletSnap = await getDoc(walletRef)
  const transaction = {
    id: input.transactionId,
    walletId: walletRef.id,
    type: 'credit',
    amount: input.amount,
    currency: 'USD',
    description: 'Depot Mobile Money en attente',
    status: 'pending',
    createdAt: new Date(),
    metadata: {
      depositMethod: 'maxicash',
      providerReference: input.reference,
      providerLogId: input.logId || null,
      phoneNumber: input.phoneNumber || null,
      email: input.email || null,
      paymentOperator: input.operator || null,
      paymentCurrency: input.currency || 'USD',
      providerPayload: input.providerPayload || null,
    },
  }

  if (walletSnap.exists()) {
    await updateDoc(walletRef, {
      userId: input.userId,
      currency: 'USD',
      updatedAt: serverTimestamp(),
      transactions: arrayUnion(transaction),
    })
    return
  }

  await setDoc(walletRef, {
    userId: input.userId,
    balance: 0,
    currency: 'USD',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    transactions: [transaction],
  })
}
