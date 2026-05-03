import { NextResponse } from 'next/server'
import { purchaseVideoWithWallet } from '@/lib/wallet-transactions'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { userId, videoId } = await request.json()
    if (!userId || !videoId) {
      return NextResponse.json({ error: 'userId et videoId sont requis' }, { status: 400 })
    }

    const result = await purchaseVideoWithWallet({ userId, videoId })
    if ((result as any).insufficientFunds) {
      return NextResponse.json(
        {
          error: 'Solde insuffisant',
          ...result,
        },
        { status: 402 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur achat portefeuille' }, { status: 500 })
  }
}
