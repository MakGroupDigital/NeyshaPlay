'use client'

import { useState } from 'react'
import { useAuth } from '@/firebase'
import { Button } from '@/components/ui/button'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { useFirestore } from '@/firebase'
import Image from 'next/image'
import type { UserRole } from '@/lib/types'
import { RoleSelection } from '@/components/role-selection'

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C41.38,36.258,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  )
}

export default function LoginPage() {
  const auth = useAuth()
  const firestore = useFirestore()
  const { toast } = useToast()
  const router = useRouter()
  const [showRoleSelection, setShowRoleSelection] = useState(false)
  const [pendingUser, setPendingUser] = useState<any>(null)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  const createUserProfile = async (user: any, role: UserRole, gender: 'male' | 'female', feedGender: 'male' | 'female' | 'all') => {
    if (!firestore) return

    setIsCreatingProfile(true)
    
    try {
      const userDocRef = doc(firestore, 'users', user.uid)
      
      const newUser = {
        name: user.displayName || user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`,
        username: `@${user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`}`,
        email: user.email,
        avatarUrl: user.photoURL || '',
        bio: role === 'creator' ? 'Créateur de contenu sur NeyshaPlay' : 'Nouveau sur NeyshaPlay',
        followers: 0,
        following: 0,
        likes: 0,
        role: role,
        gender: gender,
        feedGender: feedGender,
        createdAt: serverTimestamp()
      }

      // Optimistic UI: redirect immediately
      toast({
        title: 'Bienvenue sur NeyshaPlay!',
        description: `Votre profil ${role === 'creator' ? 'créateur' : 'utilisateur'} est en cours de création...`,
      })
      
      router.push('/')

      // Background: create profile
      await setDoc(userDocRef, newUser)
      
    } catch (error: any) {
      console.error('Error creating user profile:', error)
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de créer votre profil. Veuillez réessayer.',
      })
    } finally {
      setIsCreatingProfile(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return

    const provider = new GoogleAuthProvider()
    
    try {
      const result = await signInWithPopup(auth, provider)
      
      // Check if user already exists
      const userDocRef = doc(firestore, 'users', result.user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        // Existing user - redirect immediately
        toast({
          title: 'Bon retour!',
          description: `Bienvenue, ${result.user.displayName}!`,
        })
        router.push('/')
      } else {
        // New user - show role selection
        setPendingUser(result.user)
        setShowRoleSelection(true)
      }
    } catch (error: any) {
      console.error('Error during sign-in:', error)
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: error.message || "Une erreur s'est produite lors de la connexion.",
      })
    }
  }

  const handleRoleSelect = async (role: UserRole, gender: 'male' | 'female', feedGender: 'male' | 'female' | 'all') => {
    if (pendingUser) {
      await createUserProfile(pendingUser, role, gender, feedGender)
    }
  }

  if (showRoleSelection) {
    return <RoleSelection onRoleSelect={handleRoleSelect} isLoading={isCreatingProfile} />
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm text-center space-y-8">
        <div className="mx-auto mb-8 h-24 w-24 overflow-hidden rounded-full border-4 border-primary">
          <Image
            src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png"
            alt="NeyshaPlay Logo"
            width={96}
            height={96}
            className="object-cover"
            suppressHydrationWarning
          />
        </div>
        
        <div>
          <h1 className="text-4xl font-bold font-headline text-foreground">
            Bienvenue sur NeyshaPlay
          </h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Connectez-vous pour commencer à créer et partager.
          </p>
        </div>

        <Button
          size="lg"
          className="w-full text-lg gap-3"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Continuer avec Google
        </Button>

        <p className="text-xs text-muted-foreground">
          En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>
    </div>
  )
}
