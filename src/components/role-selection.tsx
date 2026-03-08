'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Video, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/types'

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void
  isLoading?: boolean
}

export function RoleSelection({ onRoleSelect, isLoading }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  const roles = [
    {
      value: 'user' as UserRole,
      title: 'Utilisateur',
      description: 'Je veux découvrir et regarder des vidéos',
      icon: UserIcon,
      features: [
        'Regarder des vidéos',
        'Liker et commenter',
        'Suivre des créateurs',
        'Partager du contenu'
      ]
    },
    {
      value: 'creator' as UserRole,
      title: 'Créateur',
      description: 'Je veux créer, vendre et partager mes vidéos',
      icon: Video,
      features: [
        'Créer des vidéos',
        'Vendre du contenu',
        'Partager avec la communauté',
        'Accès aux outils de création',
        'Analytics détaillées',
        'Monétisation active'
      ]
    }
  ]

  const handleConfirm = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole)
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-y-auto no-scrollbar scroll-native bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[-15%] h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_45%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-primary/40 bg-black/40 shadow-lg shadow-black/40">
            <Image
              src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png"
              alt="NeyshaPlay Logo"
              width={64}
              height={64}
              className="object-cover"
              suppressHydrationWarning
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-headline">Choisissez votre compte</h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Une seule étape avant de profiter de NeyshaPlay.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.value

            return (
              <Card
                key={role.value}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedRole(role.value)
                  }
                }}
                className={cn(
                  'group relative cursor-pointer overflow-hidden border border-white/10 bg-white/[0.04] transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.99]',
                  isSelected && 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px] shadow-primary/40'
                )}
                onClick={() => setSelectedRole(role.value)}
              >
                <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(120deg,rgba(138,255,0,0.08),transparent_40%)]" />
                <CardHeader className="relative pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40',
                      isSelected && 'border-primary/60 bg-primary/20'
                    )}>
                      <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-foreground')} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl md:text-2xl">{role.title}</CardTitle>
                      <CardDescription className="text-sm md:text-base">
                        {role.description}
                      </CardDescription>
                    </div>
                    {isSelected && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <ul className="space-y-2 text-sm text-foreground/90">
                    {role.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className={cn(
                          'mt-2 h-1.5 w-1.5 rounded-full flex-shrink-0',
                          isSelected ? 'bg-primary' : 'bg-muted-foreground'
                        )} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={handleConfirm}
            disabled={!selectedRole || isLoading}
            className="w-full max-w-md text-lg"
          >
            {isLoading ? 'Création du profil...' : 'Continuer'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Vous pourrez modifier ce choix plus tard dans votre profil.
          </p>
        </div>
      </div>
    </div>
  )
}
