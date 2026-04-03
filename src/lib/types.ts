import { DocumentReference, Timestamp } from "firebase/firestore";

export type UserRole = 'user' | 'creator';

export type User = {
  id: string
  name: string
  username: string
  avatarUrl: string
  following: number
  followers: number
  likes: number
  bio: string
  role: UserRole
  email: string
  createdAt: Timestamp
  gender?: 'female' | 'male'
  feedGender?: 'female' | 'male' | 'all'
}

export type Wallet = {
  id: string
  userId: string
  balance: number // en USD
  currency: 'USD'
  transactions: Transaction[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Transaction = {
  id: string
  walletId: string
  type: 'credit' | 'debit' | 'withdrawal' | 'earning'
  amount: number
  currency: 'USD'
  description: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  createdAt: Timestamp
  metadata?: {
    videoId?: string
    orderId?: string
    withdrawalMethod?: string
    providerReference?: string
    phoneNumber?: string
    refunded?: boolean
    providerStatus?: string
  }
}

export type Video = {
  id: string
  user: User
  userRef?: DocumentReference
  videoUrl: string
  thumbnailUrl: string
  description: string
  song: string
  likes: number
  comments: number
  shares: number
  createdAt: Timestamp
  filter?: string
  isPaid?: boolean
  price?: number
  currency?: 'USD' | 'CDF' | string
  cloudinaryPublicId?: string
  creatorGender?: 'female' | 'male'
}

export type Notification = {
  id: string
  user: Pick<User, 'name' | 'username' | 'avatarUrl'>
  type: 'like' | 'follow' | 'comment'
  content: string
  timestamp: string
  read: boolean
}

    
    
