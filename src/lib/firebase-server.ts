import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  where,
} from 'firebase/firestore'
import { firebaseConfig } from '@/firebase/config'

export function getServerFirebaseApp() {
  return getApps().find((app) => app.name === 'neyshapay-server') || initializeApp(firebaseConfig, 'neyshapay-server')
}

export function getServerFirestore() {
  return getFirestore(getServerFirebaseApp())
}

export async function getWalletRefByUserId(userId: string) {
  const firestore = getServerFirestore()
  const directRef = doc(firestore, 'wallets', userId)
  const directSnap = await getDoc(directRef)

  if (directSnap.exists()) {
    return directRef
  }

  const walletsQuery = query(collection(firestore, 'wallets'), where('userId', '==', userId), limit(1))
  const walletsSnapshot = await getDocs(walletsQuery)

  if (!walletsSnapshot.empty) {
    return walletsSnapshot.docs[0].ref
  }

  return directRef
}
