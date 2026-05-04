
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  query,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  orderBy,
  limit,
  startAfter,
  where,
  increment,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useDoc, useUser } from '@/firebase';
import { VideoCard } from '@/components/video-card';
import { type Video, type User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Play, Users, Sparkles } from 'lucide-react';
import { isAdminRole, normalizeUserRole } from '@/lib/roles';
import { creatorMatchesSearch, extractTags, normalizeSearchValue, videoMatchesSearch } from '@/lib/content-search';

const DEFAULT_PAGE_SIZE = 6;
const FEED_SIGNAL_VERSION = 1;

type FeedSignals = {
  version: number
  seenVideoIds: Record<string, number>
  creatorViews: Record<string, number>
  likedVideoIds: Record<string, number>
  likedCreators: Record<string, number>
}

const emptyFeedSignals = (): FeedSignals => ({
  version: FEED_SIGNAL_VERSION,
  seenVideoIds: {},
  creatorViews: {},
  likedVideoIds: {},
  likedCreators: {},
})

function getFeedSignalKey(userId?: string | null) {
  return `neyshaFeedSignals:${userId || 'guest'}`
}

function readFeedSignals(userId?: string | null): FeedSignals {
  if (typeof window === 'undefined') return emptyFeedSignals()
  try {
    const raw = localStorage.getItem(getFeedSignalKey(userId))
    if (!raw) return emptyFeedSignals()
    const parsed = JSON.parse(raw)
    if (parsed?.version !== FEED_SIGNAL_VERSION) return emptyFeedSignals()
    return {
      ...emptyFeedSignals(),
      ...parsed,
      seenVideoIds: parsed.seenVideoIds || {},
      creatorViews: parsed.creatorViews || {},
      likedVideoIds: parsed.likedVideoIds || {},
      likedCreators: parsed.likedCreators || {},
    }
  } catch {
    return emptyFeedSignals()
  }
}

function writeFeedSignals(userId: string | null | undefined, signals: FeedSignals) {
  if (typeof window === 'undefined') return
  try {
    const trimEntries = (entries: Record<string, number>) =>
      Object.fromEntries(
        Object.entries(entries)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 300)
      )
    localStorage.setItem(
      getFeedSignalKey(userId),
      JSON.stringify({
        ...signals,
        seenVideoIds: trimEntries(signals.seenVideoIds),
        creatorViews: trimEntries(signals.creatorViews),
        likedVideoIds: trimEntries(signals.likedVideoIds),
        likedCreators: trimEntries(signals.likedCreators),
      })
    )
  } catch {
    // ignore
  }
}

function timestampToMillis(value: any) {
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function getCreatorId(video: Video) {
  return (video.userRef as any)?.id ?? video.user?.id ?? 'unknown'
}

function rankVideosForNeyshaFeed(
  input: Video[],
  options: {
    userId?: string | null
    feedGender?: 'female' | 'male' | 'all' | null
    pageSize: number
    existingVideos?: Video[]
  }
) {
  const signals = readFeedSignals(options.userId)
  const now = Date.now()
  const existingIds = new Set((options.existingVideos || []).map((video) => video.id))
  const existingCreatorCounts = new Map<string, number>()
  ;(options.existingVideos || []).forEach((video) => {
    const creatorId = getCreatorId(video)
    existingCreatorCounts.set(creatorId, (existingCreatorCounts.get(creatorId) || 0) + 1)
  })

  const ranked = input
    .filter((video) => !existingIds.has(video.id))
    .map((video) => {
      const creatorId = getCreatorId(video)
      const createdAt = timestampToMillis(video.createdAt)
      const ageHours = Math.max(0, (now - createdAt) / 36e5)
      const recencyScore = Math.exp(-ageHours / 36) * 30
      const engagementScore =
        Math.log1p(Number(video.likes || 0)) * 5 +
        Math.log1p(Number(video.comments || 0)) * 7 +
        Math.log1p(Number(video.shares || 0)) * 8
      const creatorAffinity =
        Math.log1p(signals.creatorViews[creatorId] || 0) * 4 +
        Math.log1p(signals.likedCreators[creatorId] || 0) * 10
      const genderScore =
        options.feedGender && options.feedGender !== 'all'
          ? (video.creatorGender ?? video.user.gender) === options.feedGender
            ? 18
            : -100
          : 0
      const paidDiscovery = Number(video.price || 0) > 0 ? 2 : 0
      const seenPenalty = signals.seenVideoIds[video.id] ? 32 : 0
      const creatorRepeatPenalty = (existingCreatorCounts.get(creatorId) || 0) * 12
      const exploration = Math.random() * 16

      return {
        video,
        score:
          recencyScore +
          engagementScore +
          creatorAffinity +
          genderScore +
          paidDiscovery +
          exploration -
          seenPenalty -
          creatorRepeatPenalty,
      }
    })
    .sort((a, b) => b.score - a.score)

  const selected: Video[] = []
  const selectedCreatorCounts = new Map(existingCreatorCounts)
  for (const item of ranked) {
    const creatorId = getCreatorId(item.video)
    const count = selectedCreatorCounts.get(creatorId) || 0
    if (selected.length < Math.max(2, options.pageSize - 1) && count >= 2) continue
    selected.push(item.video)
    selectedCreatorCounts.set(creatorId, count + 1)
    if (selected.length >= options.pageSize) break
  }

  if (selected.length < options.pageSize) {
    for (const item of ranked) {
      if (selected.some((video) => video.id === item.video.id)) continue
      selected.push(item.video)
      if (selected.length >= options.pageSize) break
    }
  }

  return selected
}

function resolvePageSize() {
  if (typeof navigator === 'undefined') return DEFAULT_PAGE_SIZE;
  const connection = (navigator as any).connection as
    | {
        effectiveType?: string;
        saveData?: boolean;
      }
    | undefined;

  if (!connection) return DEFAULT_PAGE_SIZE;
  if (connection.saveData) return 4;

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 4;
    case '3g':
      return 5;
    default:
      return 7;
  }
}

function getWeekKey(date = new Date()) {
  const firstDay = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86400000)
  const week = Math.ceil((days + firstDay.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}

function VideoCardSkeleton() {
  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden rounded-none bg-black">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/5 via-transparent to-white/10" />
      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-0 right-0 p-4 space-y-3">
        <div className="h-4 w-28 rounded-full bg-white/10" />
        <div className="h-3 w-3/4 rounded-full bg-white/10" />
        <div className="h-3 w-1/2 rounded-full bg-white/10" />
      </div>
      <div className="absolute right-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-white/10" />
        <div className="h-10 w-10 rounded-full bg-white/10" />
        <div className="h-10 w-10 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export default function Home() {
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, boolean>>({});
  const [pendingStatus, setPendingStatus] = useState<Record<string, 'pending' | 'failed' | 'completed'>>({});
  const [feedGender, setFeedGender] = useState<'female' | 'male' | 'all' | null>(null);
  const [showFeedGenderTabs, setShowFeedGenderTabs] = useState(false);
  const [globalMuted, setGlobalMuted] = useState(true); // État global du son
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCreators, setSearchCreators] = useState<User[]>([]);
  const [searchVideos, setSearchVideos] = useState<Video[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<User[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const userCache = useRef<Map<string, User>>(new Map());
  const migratedRef = useRef<Set<string>>(new Set());

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: profile } = useDoc<User>(userDocRef as any);
  const isAdmin = isAdminRole(profile?.role);

  useEffect(() => {
    const updatePageSize = () => setPageSize(resolvePageSize());
    updatePageSize();

    const connection = (navigator as any)?.connection;
    if (connection?.addEventListener) {
      connection.addEventListener('change', updatePageSize);
      return () => connection.removeEventListener('change', updatePageSize);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('feedGender');
      const choiceSaved = localStorage.getItem('feedGenderChosen') === 'true';
      if (stored === 'female' || stored === 'male' || stored === 'all') {
        setFeedGender(stored);
      }
      setShowFeedGenderTabs(!choiceSaved && !(stored === 'female' || stored === 'male' || stored === 'all'));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (feedGender) return;
    const next = profile?.feedGender || profile?.gender;
    if (next === 'female' || next === 'male' || next === 'all') {
      setFeedGender(next);
      setShowFeedGenderTabs(false);
      try {
        localStorage.setItem('feedGender', next);
        localStorage.setItem('feedGenderChosen', 'true');
      } catch {
        // ignore
      }
    }
  }, [feedGender, profile?.feedGender, profile?.gender]);

  const fallbackUser = useMemo(
    () =>
      ({
        id: 'unknown',
        name: 'Utilisateur',
        username: '@utilisateur',
        avatarUrl: '',
        bio: '',
        followers: 0,
        following: 0,
        likes: 0,
        role: 'user',
        email: '',
        createdAt: null,
      }) as unknown as User,
    []
  );

  const resolveUser = useCallback(
    async (userRef: any) => {
      if (!userRef) return fallbackUser;
      const cacheKey = userRef.path || userRef.id;
      const cached = userCache.current.get(cacheKey);
      if (cached) return cached;

      try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...(userDoc.data() as Record<string, any>) } as User;
          userCache.current.set(cacheKey, userData);
          return userData;
        }
      } catch (error: any) {
        console.warn('Could not fetch user for video:', error?.code || error);
      }

      return fallbackUser;
    },
    [fallbackUser]
  );

  const persistFeedGender = useCallback(
    async (value: 'female' | 'male' | 'all') => {
      setFeedGender(value);
      try {
        localStorage.setItem('feedGender', value);
        localStorage.setItem('feedGenderChosen', 'true');
      } catch {
        // ignore
      }
      setShowFeedGenderTabs(false);

      if (firestore && authUser) {
        try {
          await setDoc(
            doc(firestore, 'users', authUser.uid),
            { feedGender: value },
            { merge: true }
          );
        } catch (error) {
          console.warn('Unable to save feed gender preference:', error);
        }
      }
    },
    [authUser, firestore]
  );

  const buildVideos = useCallback(
    async (docs: QueryDocumentSnapshot<DocumentData>[]) => {
      const results = await Promise.all(
        docs.map(async (videoDoc) => {
          const videoData = videoDoc.data();
          if (!videoData.videoUrl) return null;

          const user = await resolveUser(videoData.userRef);

          return {
            id: videoDoc.id,
            ...videoData,
            user,
            creatorGender: videoData.creatorGender ?? user.gender,
          } as Video;
        })
      );

      return results.filter((v): v is Video => !!v && !!v.videoUrl);
    },
    [resolveUser]
  );

  const loadInitial = useCallback(async () => {
    if (!firestore) return;
    setLoading(true);
    setHasMore(true);
    setLastDoc(null);
    setVideos([]);

    try {
      const fetchLimit = pageSize * 3;
      const videosQuery = query(
        collection(firestore, 'videos'),
        orderBy('createdAt', 'desc'),
        limit(fetchLimit)
      );
      const querySnapshot = await getDocs(videosQuery);
      const newVideos = await buildVideos(querySnapshot.docs);
      const shouldFilter = feedGender === 'female' || feedGender === 'male';
      const filteredVideos = shouldFilter
        ? newVideos.filter(
            (video) => (video.creatorGender ?? video.user.gender) === feedGender
          )
        : newVideos;
      const rankedVideos = rankVideosForNeyshaFeed(filteredVideos, {
        userId: authUser?.uid,
        feedGender,
        pageSize,
      })
      setVideos(rankedVideos);
      setUnlockedMap({});
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
      setHasMore(querySnapshot.docs.length === fetchLimit);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [authUser?.uid, firestore, pageSize, buildVideos, feedGender]);

  const loadMore = useCallback(async () => {
    if (!firestore || loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      const fetchLimit = pageSize * 3;
      const videosQuery = query(
        collection(firestore, 'videos'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(fetchLimit)
      );
      const querySnapshot = await getDocs(videosQuery);
      const newVideos = await buildVideos(querySnapshot.docs);
      const shouldFilter = feedGender === 'female' || feedGender === 'male';
      const filteredVideos = shouldFilter
        ? newVideos.filter(
            (video) => (video.creatorGender ?? video.user.gender) === feedGender
          )
        : newVideos;
      setVideos((prev) => [
        ...prev,
        ...rankVideosForNeyshaFeed(filteredVideos, {
          userId: authUser?.uid,
          feedGender,
          pageSize,
          existingVideos: prev,
        }),
      ]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? lastDoc);
      setHasMore(querySnapshot.docs.length === fetchLimit);
    } catch (error) {
      console.error('Error fetching more videos:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [authUser?.uid, firestore, loadingMore, hasMore, lastDoc, pageSize, buildVideos, feedGender]);

  useEffect(() => {
    if (!firestore) return;
    loadInitial();
  }, [firestore, loadInitial]);

  useEffect(() => {
    if (!firestore || !searchOpen) return;
    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        const creatorsQuery = query(
          collection(firestore, 'users'),
          orderBy('likes', 'desc'),
          limit(8)
        );
        const snapshot = await getDocs(creatorsQuery);
        if (cancelled) return;
        setSuggestedCreators(
	          snapshot.docs
	            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as User)
	            .filter((creator) => normalizeUserRole(creator.role) === 'creator')
	            .slice(0, 6)
        );
      } catch (error) {
        console.error('Error loading creator suggestions:', error);
      }
    };

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [firestore, searchOpen]);

  useEffect(() => {
    if (!firestore || !searchOpen) return;
    let cancelled = false;
    const normalizedTerm = normalizeSearchValue(searchTerm);

    if (normalizedTerm.length < 2) {
      setSearchCreators([]);
      setSearchVideos([]);
      setSearchLoading(false);
      return;
    }

    const searchTimeout = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const [usersSnapshot, videosSnapshot] = await Promise.all([
          getDocs(query(collection(firestore, 'users'), orderBy('likes', 'desc'), limit(80))),
          getDocs(query(collection(firestore, 'videos'), orderBy('createdAt', 'desc'), limit(80))),
        ]);
        if (cancelled) return;

        const creators = usersSnapshot.docs
	          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as User)
	          .filter((creator) => {
	            if (normalizeUserRole(creator.role) !== 'creator') return false;
	            return creatorMatchesSearch(creator, searchTerm);
	          })
          .slice(0, 8);

        const builtVideos = await buildVideos(videosSnapshot.docs);
        if (cancelled) return;
        const matchingVideos = builtVideos
          .filter((video) => videoMatchesSearch(video, searchTerm))
          .slice(0, 10);

        setSearchCreators(creators);
        setSearchVideos(matchingVideos);
        const trendId = `${getWeekKey()}_${normalizedTerm.replace(/[^a-z0-9]+/g, '-').slice(0, 48)}`
        await setDoc(
          doc(firestore, 'searchTrends', trendId),
          {
            term: normalizedTerm,
            week: getWeekKey(),
            count: increment(1),
            updatedAt: new Date(),
          },
          { merge: true }
        ).catch(() => undefined)
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimeout);
    };
  }, [buildVideos, firestore, searchOpen, searchTerm]);

  useEffect(() => {
    if (!firestore || !authUser || videos.length === 0) return;
    let cancelled = false;

    const syncPurchases = async () => {
      const paidVideos = videos.filter(
        (video) => (video.isPaid ?? false) || Number(video.price || 0) > 0
      );
      if (paidVideos.length === 0) return;

      try {
        const purchasesQuery = query(
          collection(firestore, 'purchases'),
          where('userId', '==', authUser.uid),
          limit(200)
        );
        const purchasesSnapshot = await getDocs(purchasesQuery);
        const purchasedIds = new Set(
          purchasesSnapshot.docs
            .map((docSnap) => docSnap.data())
            .filter((purchase) => purchase.userId === authUser.uid)
            .map((purchase) => purchase.videoId)
        );

        const computed: Record<string, boolean> = {};
        paidVideos.forEach((video) => {
          const ownerId = (video.userRef as any)?.id ?? video.user?.id;
          computed[video.id] = ownerId === authUser.uid || purchasedIds.has(video.id);
        });

        if (!cancelled) {
          setUnlockedMap((prev) => {
            const next = { ...prev };
            Object.entries(computed).forEach(([id, value]) => {
              next[id] = prev[id] || value;
            });
            return next;
          });
        }
      } catch (error) {
        console.error('Error fetching purchases:', error);
      }
    };

    syncPurchases();
    return () => {
      cancelled = true;
    };
  }, [firestore, authUser, videos]);

  useEffect(() => {
    if (!firestore || videos.length === 0) return;
    const candidates = videos.filter(
      (video) => !video.creatorGender && video.user?.gender
    );
    if (candidates.length === 0) return;

    candidates.forEach(async (video) => {
      if (migratedRef.current.has(video.id)) return;
      migratedRef.current.add(video.id);
      try {
        await updateDoc(doc(firestore, 'videos', video.id), {
          creatorGender: video.user.gender,
        });
      } catch (error) {
        console.warn('Migration creatorGender failed:', error);
      }
    });
  }, [firestore, videos]);

  const handlePay = useCallback(
    async (video: Video) => {
      if (!authUser) {
        router.push('/login');
        return;
      }
      if (!firestore) return;

      try {
        const response = await fetch('/api/wallet/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUser.uid,
            videoId: video.id,
          }),
        })
        const data = await response.json()
        if (response.status === 402) {
          setUnlockedMap((prev) => ({ ...prev, [video.id]: false }))
          return {
            status: 'insufficient' as const,
            balance: Number(data?.balance || 0),
            amount: Number(data?.amount || video.price || 0),
          }
        }
        if (!response.ok) {
          throw new Error(data?.error || 'Achat impossible')
        }

        setUnlockedMap((prev) => ({ ...prev, [video.id]: true }));
        setPendingStatus((prev) => ({ ...prev, [video.id]: 'completed' }))
        toast({
          title: 'Accès débloqué',
          description: 'Vous pouvez maintenant regarder ce contenu.',
        });
        return { status: 'unlocked' as const }
      } catch (error) {
        console.error('Payment error:', error);
        setUnlockedMap((prev) => ({ ...prev, [video.id]: false }));
        toast({
          title: 'Paiement échoué',
          description: 'Veuillez réessayer.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [authUser, firestore, router, toast]
  );

  const handleFeedSignal = useCallback(
    (video: Video, event: 'view' | 'like') => {
      const signals = readFeedSignals(authUser?.uid)
      const now = Date.now()
      const creatorId = getCreatorId(video)

      if (event === 'view') {
        if (signals.seenVideoIds[video.id] && now - signals.seenVideoIds[video.id] < 30_000) {
          return
        }
        signals.seenVideoIds[video.id] = now
        signals.creatorViews[creatorId] = (signals.creatorViews[creatorId] || 0) + 1
      }

      if (event === 'like') {
        signals.likedVideoIds[video.id] = now
        signals.likedCreators[creatorId] = (signals.likedCreators[creatorId] || 0) + 1
      }

      writeFeedSignals(authUser?.uid, signals)
    },
    [authUser?.uid]
  );

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '600px 0px', threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const genderTabs = (
    <div className="pointer-events-none fixed top-[calc(4rem+env(safe-area-inset-top))] left-0 right-0 z-30">
      <div className="pointer-events-auto mx-auto flex w-full justify-center px-4 md:max-w-[640px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 p-1 shadow-lg shadow-black/40 backdrop-blur-md">
          {(
            [
              { value: 'all' as const, label: 'Tous' },
              { value: 'female' as const, label: 'Femme' },
              { value: 'male' as const, label: 'Homme' },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => persistFeedGender(item.value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
                feedGender === item.value || (!feedGender && item.value === 'all')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const openCreator = (creator: User) => {
    setSearchOpen(false);
    router.push(`/u/${creator.id}`);
  };

  const openVideoFromSearch = (video: Video) => {
    setSearchOpen(false);
    setVideos((prev) => {
      const existing = prev.filter((item) => item.id !== video.id);
      return [video, ...existing];
    });
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const searchPanel = (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-[calc(1rem+env(safe-area-inset-top))] max-h-[calc(100dvh-2rem)] translate-y-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-white/10 px-5 pb-4 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Recherche
          </DialogTitle>
          <div className="relative pt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Créateur, #tag, contenu, prix..."
              className="h-11 rounded-full pl-9 pr-4"
            />
          </div>
        </DialogHeader>

        <div className="max-h-[calc(100dvh-10rem)] space-y-5 overflow-y-auto px-5 py-4">
          {searchTerm.trim().length >= 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Créateurs</h3>
                {searchLoading && <span className="text-xs text-muted-foreground">Recherche...</span>}
              </div>
              {searchCreators.length > 0 ? (
                <div className="space-y-2">
                  {searchCreators.map((creator) => (
                    <button
                      key={creator.id}
                      type="button"
                      onClick={() => openCreator(creator)}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                        <AvatarFallback>{creator.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{creator.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{creator.username}</p>
                      </div>
                      <span className="text-xs text-primary">{Number(creator.likes || 0).toLocaleString()} likes</span>
                    </button>
                  ))}
                </div>
              ) : (
                !searchLoading && (
                  <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
                    Aucun créateur trouvé.
                  </p>
                )
              )}
            </div>
          )}

          {searchTerm.trim().length >= 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Contenus</h3>
              {searchVideos.length > 0 ? (
                <div className="space-y-2">
                  {searchVideos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => openVideoFromSearch(video)}
                      className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:bg-white/10"
                    >
                      <div className="flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black">
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Play className="h-4 w-4 text-white/70" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium">{video.description || 'Contenu vidéo'}</p>
	                        <p className="truncate text-xs text-muted-foreground">
	                          {video.user?.username} · {Number(video.likes || 0).toLocaleString()} likes
	                          {video.isPaid || Number(video.price || 0) > 0 ? ` · ${video.price || 0} ${video.currency || 'USD'}` : ''}
	                        </p>
	                        <div className="mt-1 flex flex-wrap gap-1">
	                          {extractTags(video.description).slice(0, 3).map((tag) => (
	                            <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>
	                          ))}
	                        </div>
	                      </div>
	                    </button>
                  ))}
                </div>
              ) : (
                !searchLoading && (
                  <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-muted-foreground">
                    Aucun contenu trouvé.
                  </p>
                )
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-white">Suggestions créateurs</h3>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>Basées sur votre choix de contenu, vos vues, vos likes et les créateurs populaires.</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {suggestedCreators.map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => openCreator(creator)}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 text-center transition-colors hover:bg-white/10"
                >
                  <Avatar className="mx-auto h-12 w-12">
                    <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                    <AvatarFallback>{creator.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <p className="mt-2 truncate text-xs font-semibold">{creator.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{creator.username}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const searchButton = (
    <div className="fixed right-[calc(1rem+env(safe-area-inset-right))] top-[calc(1rem+env(safe-area-inset-top))] z-40">
      <Button
        type="button"
        size="icon"
        className="h-11 w-11 rounded-full border border-white/15 bg-black/65 text-white shadow-lg shadow-black/30 backdrop-blur-md hover:bg-black/80"
        onClick={() => setSearchOpen(true)}
        aria-label="Rechercher"
      >
        <Search className="h-5 w-5" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full">
        {searchButton}
        {searchPanel}
        {showFeedGenderTabs && genderTabs}
        <div className="w-full md:mx-auto md:max-w-[640px]">
          {Array.from({ length: 2 }).map((_, index) => (
            <VideoCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {searchButton}
      {searchPanel}
      {showFeedGenderTabs && genderTabs}
      <div className="w-full md:mx-auto md:max-w-[640px]">
        {videos.map((video) => {
          const ownerId = (video.userRef as any)?.id ?? video.user?.id;
          const isOwner = authUser && ownerId === authUser.uid;
          const isLocked =
            Boolean((video.isPaid ?? false) || Number(video.price || 0) > 0) &&
            !isOwner &&
            !isAdmin &&
            !unlockedMap[video.id];
          const status = pendingStatus[video.id];

          return (
            <VideoCard
              key={video.id}
              video={video}
              isLocked={isLocked}
              pendingStatus={status}
              onPay={handlePay}
              onFeedSignal={handleFeedSignal}
              globalMuted={globalMuted}
              onMuteToggle={setGlobalMuted}
            />
          );
        })}
        {loadingMore && <VideoCardSkeleton />}
        {hasMore && <div ref={loadMoreRef} className="h-10" />}
        {!hasMore && videos.length === 0 && (
          <div className="flex min-h-[60dvh] items-center justify-center text-muted-foreground">
            Aucun contenu disponible pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}
