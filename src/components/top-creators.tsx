'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useFirestore } from '@/firebase/provider'
import { useUser } from '@/firebase'
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'
import type { User } from '@/lib/types'

function NeyshaIcon() {
  return (
    <div className="relative h-5 w-5">
      <div className="absolute inset-0 rounded-[6px] bg-primary/90 shadow-[0_0_12px_hsl(var(--primary)/0.45)]" />
      <div className="absolute inset-[2px] rounded-[5px] border border-white/25" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-0 w-0 border-y-[4px] border-y-transparent border-l-[7px] border-l-black/80 translate-x-[1px]" />
      </div>
    </div>
  )
}

export function TopCreators() {
  const firestore = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const [topCreators, setTopCreators] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [userGender, setUserGender] = useState<'male' | 'female' | null>(null)
  const [preferredGender, setPreferredGender] = useState<'male' | 'female' | 'all' | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('feedGender')
      if (stored === 'female' || stored === 'male' || stored === 'all') {
        setPreferredGender(stored)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const fetchUserGender = async () => {
      if (!firestore || !user) return

      try {
        const userDocRef = doc(firestore, 'users', user.uid)
        const userSnap = await getDoc(userDocRef)
        if (userSnap.exists()) {
          const userData = userSnap.data() as Partial<User>
          setUserGender((userData.gender as 'male' | 'female' | undefined) ?? null)
          if (!preferredGender) {
            const saved = (userData.feedGender as 'male' | 'female' | 'all' | undefined) ?? null
            if (saved) {
              setPreferredGender(saved)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user gender:', error)
      }
    }

    fetchUserGender()
  }, [firestore, user, preferredGender])

  const effectiveGender = useMemo(() => {
    if (preferredGender === 'all') return null
    return preferredGender ?? userGender
  }, [preferredGender, userGender])

  useEffect(() => {
    const fetchTopCreators = async () => {
      if (!firestore) return
      setLoading(true)

      try {
        const usersQuery = query(
          collection(firestore, 'users'),
          orderBy('likes', 'desc'),
          limit(50)
        )
        const usersSnapshot = await getDocs(usersQuery)
        const users = usersSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as User[]

        const creators = users.filter((creator) => creator.role === 'creator')
        const filteredByGender = effectiveGender
          ? creators.filter((creator) => creator.gender === effectiveGender)
          : creators

        const sorted = [...filteredByGender].sort((a, b) => (b.likes || 0) - (a.likes || 0))
        if (sorted.length >= 5 || !effectiveGender) {
          setTopCreators(sorted.slice(0, 5))
        } else {
          const fallbackSorted = [...creators].sort((a, b) => (b.likes || 0) - (a.likes || 0))
          setTopCreators(fallbackSorted.slice(0, 5))
        }
      } catch (error) {
        console.error('Error fetching top creators:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopCreators()
  }, [firestore, effectiveGender])

  const handleCreatorClick = (creatorId: string) => {
    router.push(`/u/${creatorId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 ml-3">
        <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
        <div className="flex items-center -space-x-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-9 rounded-full bg-white/10 border-2 border-black animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (topCreators.length === 0) {
    return null
  }

  const title = effectiveGender === 'female'
    ? 'Top créatrice'
    : effectiveGender === 'male'
      ? 'Top créateur'
      : 'Top créateur'

  return (
    <div className="flex items-center gap-2 ml-2 min-w-0">
      <div className="flex items-center gap-2 text-xs text-white/90 font-semibold whitespace-nowrap">
        <NeyshaIcon />
        <span>{title}</span>
      </div>
      
      <div className="flex items-center -space-x-2">
        {topCreators.map((creator, index) => (
          <button
            key={creator.id}
            onClick={() => handleCreatorClick(creator.id)}
            className="relative group transition-transform hover:scale-110 hover:z-10"
            style={{ zIndex: 5 - index }}
          >
            <Avatar 
              className={`h-9 w-9 border-2 border-black ring-2 ring-primary/50 transition-all group-hover:ring-primary group-hover:ring-4 ${
                index === 0 ? 'ring-primary ring-3' : ''
              }`}
            >
              <AvatarImage src={creator.avatarUrl} alt={creator.name} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {creator.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            {/* Rank badge for top 3 */}
            {index < 3 && (
              <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                index === 0 ? 'bg-yellow-500 text-black' :
                index === 1 ? 'bg-gray-300 text-black' :
                'bg-amber-600 text-white'
              }`}>
                {index + 1}
              </div>
            )}
            
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {creator.name}
              <div className="text-[10px] text-primary">
                {creator.likes.toLocaleString()} likes
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
