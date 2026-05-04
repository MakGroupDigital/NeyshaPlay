import { NextResponse } from 'next/server'
import { arrayUnion, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { getServerFirestore, getWalletRefByUserId } from '@/lib/firebase-server'
import { hasCreatorAccess } from '@/lib/roles'
import { PLATFORM_COMMISSION_PERCENT, PLATFORM_COMMISSION_RATE } from '@/lib/wallet-transactions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, amount, phoneNumber, method } = await request.json()
    const numericAmount = Number(amount)

    if (!userId || !Number.isFinite(numericAmount) || numericAmount <= 0 || !phoneNumber) {
      return NextResponse.json({ error: 'userId, amount et phoneNumber sont requis' }, { status: 400 })
    }

    const firestore = getServerFirestore()
    const userSnap = await getDoc(doc(firestore, 'users', userId))
    const kycSnap = await getDoc(doc(firestore, 'creatorKyc', userId)).catch(() => null)
    const userData = userSnap.exists() ? userSnap.data() : null
    const kycStatus = kycSnap?.exists() ? kycSnap.data()?.status : userData?.kycStatus
    if (!userSnap.exists() || !hasCreatorAccess(userData as any, kycStatus)) {
      return NextResponse.json({ error: 'Retrait reserve aux comptes createurs' }, { status: 403 })
    }
    if (kycStatus !== 'approved') {
      return NextResponse.json(
        { error: 'Confirmez votre identité avant de retirer vos fonds' },
        { status: 403 }
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
      return NextResponse.json({ error: 'Solde insuffisant pour cette demande' }, { status: 400 })
    }

    const requestRef = doc(collection(firestore, 'withdrawalRequests'))
    const transactionId = `withdraw_request_${requestRef.id}`
    const normalizedPhone = String(phoneNumber).trim()
    const withdrawalMethod = method || 'mobile_money'
    const platformCommissionAmount = Math.round(numericAmount * PLATFORM_COMMISSION_RATE * 100) / 100
    const netPayoutAmount = Math.max(0, numericAmount - platformCommissionAmount)

    await setDoc(requestRef, {
      userId,
      walletId: walletRef.id,
      amount: numericAmount,
      platformCommissionPercent: PLATFORM_COMMISSION_PERCENT,
      platformCommissionAmount,
      netPayoutAmount,
      currency: 'USD',
      method: withdrawalMethod,
      phoneNumber: normalizedPhone,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await updateDoc(walletRef, {
      userId,
      currency: 'USD',
      updatedAt: serverTimestamp(),
      transactions: arrayUnion({
        id: transactionId,
        walletId: walletRef.id,
        type: 'withdrawal',
        amount: numericAmount,
        currency: 'USD',
        description: 'Demande de retrait Mobile Money',
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          withdrawalMethod,
          withdrawalRequestId: requestRef.id,
          phoneNumber: normalizedPhone,
          platformCommissionPercent: PLATFORM_COMMISSION_PERCENT,
          platformCommissionAmount,
          grossAmount: numericAmount,
          netPayoutAmount,
        },
      }),
    })

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
      transactionId,
      transactionStatus: 'pending',
      platformCommissionAmount,
      netPayoutAmount,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur demande de retrait' }, { status: 500 })
  }
}
