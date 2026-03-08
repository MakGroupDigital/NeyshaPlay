'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Bell, Shield, Video, Wallet, User2, LogOut, Key, Globe, Palette, UserX, Sparkles } from 'lucide-react'
import type { User } from '@/lib/types'

type NotificationSettings = {
  likes: boolean
  comments: boolean
  follows: boolean
  messages: boolean
}

type PrivacySettings = {
  privateAccount: boolean
  showEmail: boolean
  allowDuet: boolean
  allowDownload: boolean
}

type PlaybackSettings = {
  autoPlay: boolean
  dataSaver: boolean
  wifiOnlyUpload: boolean
}

type SecuritySettings = {
  twoFactorEnabled: boolean
  loginAlerts: boolean
  deviceVerification: boolean
}

type AppearanceSettings = {
  reduceMotion: boolean
  highContrast: boolean
  compactMode: boolean
}

type LanguageSettings = {
  locale: 'fr' | 'en'
}

type BlockSettings = {
  blockedUserIds: string[]
}

type CreatorSettings = {
  monetizationEnabled: boolean
  defaultPaid: boolean
  defaultPrice: string
  currency: 'USD' | 'CDF'
  payoutMethod: 'mobile_money' | 'bank' | 'paypal'
  payoutAccount: string
  allowTips: boolean
  previewSeconds: string
  platformFee: string
}

type UserSettings = {
  notifications: NotificationSettings
  privacy: PrivacySettings
  playback: PlaybackSettings
  security: SecuritySettings
  appearance: AppearanceSettings
  language: LanguageSettings
  blocks: BlockSettings
  creator: CreatorSettings
}

const defaultSettings: UserSettings = {
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    messages: true,
  },
  privacy: {
    privateAccount: false,
    showEmail: false,
    allowDuet: true,
    allowDownload: true,
  },
  playback: {
    autoPlay: true,
    dataSaver: false,
    wifiOnlyUpload: false,
  },
  security: {
    twoFactorEnabled: false,
    loginAlerts: true,
    deviceVerification: true,
  },
  appearance: {
    reduceMotion: false,
    highContrast: false,
    compactMode: false,
  },
  language: {
    locale: 'fr',
  },
  blocks: {
    blockedUserIds: [],
  },
  creator: {
    monetizationEnabled: true,
    defaultPaid: false,
    defaultPrice: '',
    currency: 'USD',
    payoutMethod: 'mobile_money',
    payoutAccount: '',
    allowTips: true,
    previewSeconds: '5',
    platformFee: '10',
  },
}

export default function SettingsPage() {
  const router = useRouter()
  const auth = useAuth()
  const firestore = useFirestore()
  const { user: authUser, loading: userLoading } = useUser()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<User | null>(null)
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [blockedInput, setBlockedInput] = useState('')

  useEffect(() => {
    if (!userLoading && !authUser) {
      router.replace('/login')
    }
  }, [userLoading, authUser, router])

  useEffect(() => {
    const load = async () => {
      if (!firestore || !authUser) return
      setLoading(true)
      try {
        const ref = doc(firestore, 'users', authUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as User & { settings?: Partial<UserSettings> }
          setProfile(data)
          setSettings({
            ...defaultSettings,
            ...data.settings,
            notifications: {
              ...defaultSettings.notifications,
              ...(data.settings?.notifications || {}),
            },
            privacy: {
              ...defaultSettings.privacy,
              ...(data.settings?.privacy || {}),
            },
            playback: {
              ...defaultSettings.playback,
              ...(data.settings?.playback || {}),
            },
            security: {
              ...defaultSettings.security,
              ...(data.settings?.security || {}),
            },
            appearance: {
              ...defaultSettings.appearance,
              ...(data.settings?.appearance || {}),
            },
            language: {
              ...defaultSettings.language,
              ...(data.settings?.language || {}),
            },
            blocks: {
              ...defaultSettings.blocks,
              ...(data.settings?.blocks || {}),
            },
            creator: {
              ...defaultSettings.creator,
              ...(data.settings?.creator || {}),
            },
          })
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [firestore, authUser])

  const handleSave = async () => {
    if (!firestore || !authUser || !profile) return
    setIsSaving(true)
    try {
      await setDoc(
        doc(firestore, 'users', authUser.uid),
        {
          name: profile.name,
          username: profile.username,
          bio: profile.bio,
          settings,
        },
        { merge: true }
      )
      toast({
        title: 'Paramètres mis à jour',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos paramètres.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    if (!auth) return
    await signOut(auth)
    router.replace('/login')
  }

  const handleAddBlockedUser = () => {
    const value = blockedInput.trim()
    if (!value) return
    if (settings.blocks.blockedUserIds.includes(value)) {
      setBlockedInput('')
      return
    }
    setSettings((prev) => ({
      ...prev,
      blocks: {
        blockedUserIds: [value, ...prev.blocks.blockedUserIds],
      },
    }))
    setBlockedInput('')
  }

  const handleRemoveBlockedUser = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      blocks: {
        blockedUserIds: prev.blocks.blockedUserIds.filter((item) => item !== value),
      },
    }))
  }

  if (userLoading || loading || !profile) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const isCreator = profile.role === 'creator'

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-headline">Paramètres</h1>
          <p className="text-sm text-muted-foreground">Gérez votre compte et vos préférences</p>
        </div>
      </div>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User2 className="h-5 w-5 text-primary" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nom</Label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile((prev) => prev && { ...prev, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Nom d'utilisateur</Label>
            <Input
              value={profile.username}
              onChange={(e) => setProfile((prev) => prev && { ...prev, username: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Bio</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile((prev) => prev && { ...prev, bio: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            { key: 'likes', label: 'Likes' },
            { key: 'comments', label: 'Commentaires' },
            { key: 'follows', label: 'Nouveaux abonnés' },
            { key: 'messages', label: 'Messages' },
          ] as const).map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <Label>{item.label}</Label>
              <Switch
                checked={settings.notifications[item.key]}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, [item.key]: checked },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Confidentialité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Compte privé</Label>
            <Switch
              checked={settings.privacy.privateAccount}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, privateAccount: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Afficher l'email</Label>
            <Switch
              checked={settings.privacy.showEmail}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, showEmail: checked },
                }))
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Autoriser les duos</Label>
            <Switch
              checked={settings.privacy.allowDuet}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, allowDuet: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Autoriser le téléchargement</Label>
            <Switch
              checked={settings.privacy.allowDownload}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, allowDownload: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5 text-primary" />
            Lecture & données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Lecture automatique</Label>
            <Switch
              checked={settings.playback.autoPlay}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  playback: { ...prev.playback, autoPlay: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Économie de données</Label>
            <Switch
              checked={settings.playback.dataSaver}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  playback: { ...prev.playback, dataSaver: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Upload Wi‑Fi uniquement</Label>
            <Switch
              checked={settings.playback.wifiOnlyUpload}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  playback: { ...prev.playback, wifiOnlyUpload: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" />
            Sécurité & accès
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Authentification à deux facteurs</Label>
            <Switch
              checked={settings.security.twoFactorEnabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  security: { ...prev.security, twoFactorEnabled: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Alertes de connexion</Label>
            <Switch
              checked={settings.security.loginAlerts}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  security: { ...prev.security, loginAlerts: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Vérification des appareils</Label>
            <Switch
              checked={settings.security.deviceVerification}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  security: { ...prev.security, deviceVerification: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" />
            Langue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label>Langue de l’application</Label>
            <select
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={settings.language.locale}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  language: { locale: e.target.value as LanguageSettings['locale'] },
                }))
              }
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Apparence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Réduire les animations</Label>
            <Switch
              checked={settings.appearance.reduceMotion}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, reduceMotion: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Contraste élevé</Label>
            <Switch
              checked={settings.appearance.highContrast}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, highContrast: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mode compact</Label>
            <Switch
              checked={settings.appearance.compactMode}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  appearance: { ...prev.appearance, compactMode: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserX className="h-5 w-5 text-primary" />
            Utilisateurs bloqués
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Bloquer un utilisateur (ID ou @)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="@utilisateur ou uid"
                value={blockedInput}
                onChange={(e) => setBlockedInput(e.target.value)}
              />
              <Button onClick={handleAddBlockedUser}>Ajouter</Button>
            </div>
          </div>
          {settings.blocks.blockedUserIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun utilisateur bloqué.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {settings.blocks.blockedUserIds.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRemoveBlockedUser(value)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground hover:bg-white/10"
                >
                  {value} ✕
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isCreator && (
        <Card className="border-white/10 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Créateur & revenus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Monétisation active</Label>
              <Switch
                checked={settings.creator.monetizationEnabled}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, monetizationEnabled: checked },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Contenu payant par défaut</Label>
              <Switch
                checked={settings.creator.defaultPaid}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, defaultPaid: checked },
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Prix par défaut</Label>
              <Input
                type="number"
                value={settings.creator.defaultPrice}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, defaultPrice: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Devise</Label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={settings.creator.currency}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, currency: e.target.value as 'USD' | 'CDF' },
                  }))
                }
              >
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>Activer les pourboires</Label>
              <Switch
                checked={settings.creator.allowTips}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, allowTips: checked },
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Prévisualisation gratuite (secondes)</Label>
              <Input
                type="number"
                value={settings.creator.previewSeconds}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, previewSeconds: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Commission plateforme (%)</Label>
              <Input
                type="number"
                value={settings.creator.platformFee}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, platformFee: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Méthode de paiement</Label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={settings.creator.payoutMethod}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, payoutMethod: e.target.value as CreatorSettings['payoutMethod'] },
                  }))
                }
              >
                <option value="mobile_money">Mobile Money</option>
                <option value="bank">Banque</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Compte de paiement</Label>
              <Input
                placeholder="Ex: +243 00 000 0000"
                value={settings.creator.payoutAccount}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    creator: { ...prev.creator, payoutAccount: e.target.value },
                  }))
                }
              />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              Activez les options avancées pour mieux monétiser vos contenus.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </div>
    </div>
  )
}
