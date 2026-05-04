'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { useDoc, useFirestore, useUser } from '@/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { User } from '@/lib/types'

export function GenderGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const firestore = useFirestore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<'female' | 'male' | 'all' | ''>('')
  const [savedLocally, setSavedLocally] = useState(false)

  const userRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])

  const { data: profile, loading: profileLoading } = useDoc<User>(userRef as any)

  useEffect(() => {
    if (!user) return
    try {
      setSavedLocally(
        localStorage.getItem(`feedGenderChosen:${user.uid}`) === 'true' ||
          localStorage.getItem('feedGenderChosen') === 'true'
      )
    } catch {
      setSavedLocally(false)
    }
  }, [user])

  useEffect(() => {
    if (profile?.feedGender && selected === '') {
      setSelected(profile.feedGender)
    }
  }, [profile?.feedGender, selected])

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user || savedLocally || profile?.feedGenderLocked) {
    return <>{children}</>
  }

  const handleSave = async () => {
    if (!userRef || !selected) {
      toast({
        title: 'Préférence requise',
        description: 'Choisissez le type de contenu que vous souhaitez voir.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await setDoc(
        userRef,
        {
          feedGender: selected,
          feedGenderLocked: true,
        },
        { merge: true }
      )
      try {
        localStorage.setItem(`feedGenderChosen:${user.uid}`, 'true')
        localStorage.setItem('feedGender', selected)
        localStorage.setItem('feedGenderChosen', 'true')
      } catch {
        // ignore
      }
      setSavedLocally(true)
      toast({ title: 'Préférence enregistrée' })
    } catch (error) {
      console.error('Failed to save gender:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible d’enregistrer votre sexe.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-white/10 bg-card p-6 text-center space-y-4">
        <div>
          <h2 className="text-2xl font-bold font-headline">Choisissez le type de contenu que vous souhaitez voir</h2>
          <p className="text-sm text-muted-foreground">
            Ce choix concerne uniquement les contenus affichés dans votre fil. Il ne définit pas votre identité personnelle et ne réapparaîtra plus après validation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={selected === 'female' ? 'default' : 'secondary'}
            className="h-12"
            onClick={() => setSelected('female')}
          >
            Contenus de créatrices
          </Button>
          <Button
            variant={selected === 'male' ? 'default' : 'secondary'}
            className="h-12"
            onClick={() => setSelected('male')}
          >
            Contenus de créateurs
          </Button>
          <Button
            variant={selected === 'all' ? 'default' : 'secondary'}
            className="h-12"
            onClick={() => setSelected('all')}
          >
            Tous les contenus
          </Button>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving || !selected}>
          {saving ? 'Enregistrement...' : 'Continuer'}
        </Button>
      </Card>
    </div>
  )
}
