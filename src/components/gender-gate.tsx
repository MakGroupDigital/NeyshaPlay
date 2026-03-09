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
  const [selected, setSelected] = useState<'female' | 'male' | ''>('')

  const userRef = useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, 'users', user.uid)
  }, [firestore, user])

  const { data: profile, loading: profileLoading } = useDoc<User>(userRef)

  useEffect(() => {
    if (profile?.gender && selected === '') {
      setSelected(profile.gender)
    }
  }, [profile?.gender, selected])

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user || (profile && profile.gender)) {
    return <>{children}</>
  }

  const handleSave = async () => {
    if (!userRef || !selected) {
      toast({
        title: 'Sexe requis',
        description: 'Veuillez sélectionner votre sexe.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await setDoc(
        userRef,
        {
          gender: selected,
          feedGender: profile?.feedGender ?? selected,
        },
        { merge: true }
      )
      toast({ title: 'Sexe enregistré' })
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
          <h2 className="text-2xl font-bold font-headline">Sexe obligatoire</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez votre sexe pour continuer.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={selected === 'female' ? 'default' : 'secondary'}
            className="h-12"
            onClick={() => setSelected('female')}
          >
            Femme
          </Button>
          <Button
            variant={selected === 'male' ? 'default' : 'secondary'}
            className="h-12"
            onClick={() => setSelected('male')}
          >
            Homme
          </Button>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving || !selected}>
          {saving ? 'Enregistrement...' : 'Continuer'}
        </Button>
      </Card>
    </div>
  )
}
