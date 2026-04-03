
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
  increment,
  orderBy,
  limit,
  startAfter,
  where,
  addDoc,
  serverTimestamp,
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

type PendingItem = { purchaseId: string; videoId?: string }
const PENDING_KEY = 'pendingPurchases'

const readPending = (): PendingItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((p) => p?.purchaseId)
    return []
  } catch {
    return []
  }
}

const writePending = (list: PendingItem[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(PENDING_KEY, JSON.stringify(list))
}

const notifyPendingUpdate = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pending-purchase-added'))
}

const DEFAULT_PAGE_SIZE = 6;

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
  const [globalMuted, setGlobalMuted] = useState(true); // État global du son
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const userCache = useRef<Map<string, User>>(new Map());
  const migratedRef = useRef<Set<string>>(new Set());

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: profile } = useDoc<User>(userDocRef);

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
      if (stored === 'female' || stored === 'male' || stored === 'all') {
        setFeedGender(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (feedGender) return;
    const next = profile?.feedGender || profile?.gender;
    if (next === 'female' || next === 'male' || next === 'all') {
      setFeedGender(next);
      try {
        localStorage.setItem('feedGender', next);
      } catch {
        // ignore
      }
    }
  }, [feedGender, profile?.feedGender, profile?.gender]);

  // Écoute globale des statuts d'achat (watcher)
  useEffect(() => {
    const handler = (event: any) => {
      const detail = event?.detail as { videoId?: string; status?: string } | undefined
      if (!detail?.videoId) return
      if (detail.status === 'completed') {
        setUnlockedMap((prev) => ({ ...prev, [detail.videoId!]: true }))
        setPendingStatus((prev) => ({ ...prev, [detail.videoId!]: 'completed' }))
        toast({ title: 'Accès débloqué', description: 'Vous pouvez maintenant regarder ce contenu.' })
      } else if (detail.status === 'failed') {
        setPendingStatus((prev) => ({ ...prev, [detail.videoId!]: 'failed' }))
        setUnlockedMap((prev) => ({ ...prev, [detail.videoId!]: false }))
        toast({
          title: 'Paiement non abouti',
          description: 'Vous pouvez réessayer plus tard.',
          variant: 'destructive',
        })
      }
    }

    window.addEventListener('purchase-status', handler)
    return () => window.removeEventListener('purchase-status', handler)
  }, [toast])

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
      }) as User,
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
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
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
      } catch {
        // ignore
      }

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
      setVideos(filteredVideos.slice(0, pageSize));
      setUnlockedMap({});
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
      setHasMore(querySnapshot.docs.length === fetchLimit);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [firestore, pageSize, buildVideos, feedGender]);

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
      setVideos((prev) => [...prev, ...filteredVideos.slice(0, pageSize)]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? lastDoc);
      setHasMore(querySnapshot.docs.length === fetchLimit);
    } catch (error) {
      console.error('Error fetching more videos:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [firestore, loadingMore, hasMore, lastDoc, pageSize, buildVideos, feedGender]);

  useEffect(() => {
    if (!firestore) return;
    loadInitial();
  }, [firestore, loadInitial]);

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
    async (
      video: Video,
      method: 'mobile-money' | 'wallet' | 'paypal',
      details?: { phoneNumber?: string }
    ) => {
      if (!authUser) {
        router.push('/login');
        return;
      }
      if (!firestore) return;

      if (method === 'paypal') {
        try {
          const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoId: video.id,
              amount: Number(video.price ?? 0),
              currency: video.currency ?? 'USD',
            }),
          })
          const data = await response.json()
          if (!response.ok || !data?.approveUrl) {
            throw new Error(data?.error || 'PayPal order failed')
          }
          window.location.href = data.approveUrl as string
          return
        } catch (error) {
          console.error('PayPal error:', error)
          toast({
            title: 'Paiement PayPal échoué',
            description: 'Veuillez réessayer.',
            variant: 'destructive',
          })
          throw error
        }
      }

      if (method === 'mobile-money') {
        try {
          const response = await fetch('/api/wonyapay/purchase/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: authUser.uid,
              videoId: video.id,
              phoneNumber: details?.phoneNumber,
            }),
          })
          const data = await response.json()
          if (!response.ok) {
            throw new Error(data?.error || 'Paiement WonyaPay echoue')
          }
          if (data?.transactionStatus === 'completed') {
            setUnlockedMap((prev) => ({ ...prev, [video.id]: true }))
            setPendingStatus((prev) => ({ ...prev, [video.id]: 'completed' }))
            toast({
              title: 'Acces debloque',
              description: 'Vous pouvez maintenant regarder ce contenu.',
            })
            return
          }

          // En attente : stocker et laisser le watcher gérer
          const existing = readPending()
          writePending([...existing, { purchaseId: data.purchaseId, videoId: video.id }])
          notifyPendingUpdate()
          setPendingStatus((prev) => ({ ...prev, [video.id]: 'pending' }))
          setUnlockedMap((prev) => ({ ...prev, [video.id]: false }))
          toast({
            title: 'Confirmation requise',
            description: 'Nous sommes en attente de la confirmation de votre paiement.',
          })
          return
        } catch (error: any) {
          setUnlockedMap((prev) => ({ ...prev, [video.id]: false }))
          setPendingStatus((prev) => ({ ...prev, [video.id]: 'failed' }))
          toast({
            title: 'Paiement WonyaPay echoue',
            description: error?.message || 'Veuillez reessayer.',
            variant: 'destructive',
          })
          throw error
        }
      }

      setUnlockedMap((prev) => ({ ...prev, [video.id]: true }));

      try {
        await addDoc(collection(firestore, 'purchases'), {
          userId: authUser.uid,
          videoId: video.id,
          amount: video.price ?? 0,
          currency: video.currency ?? 'USD',
          method,
          status: 'completed',
          createdAt: serverTimestamp(),
        });

        const creatorId = (video.userRef as any)?.id ?? video.user?.id
        if (creatorId && creatorId !== authUser.uid) {
          const walletRef = doc(firestore, 'wallets', creatorId)
          const walletSnap = await getDoc(walletRef)
          if (walletSnap.exists()) {
            await updateDoc(walletRef, {
              balance: increment(video.price ?? 0),
              currency: video.currency ?? 'USD',
              updatedAt: serverTimestamp(),
              userId: creatorId,
            })
          } else {
            await setDoc(walletRef, {
              userId: creatorId,
              balance: video.price ?? 0,
              currency: video.currency ?? 'USD',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          }
        }

        toast({
          title: 'Accès débloqué',
          description: 'Vous pouvez maintenant regarder ce contenu.',
        });
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

  if (loading) {
    return (
      <div className="w-full">
        {genderTabs}
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
      {genderTabs}
      <div className="w-full md:mx-auto md:max-w-[640px]">
        {videos.map((video) => {
          const ownerId = (video.userRef as any)?.id ?? video.user?.id;
          const isOwner = authUser && ownerId === authUser.uid;
          const isLocked =
            Boolean((video.isPaid ?? false) || Number(video.price || 0) > 0) &&
            !isOwner &&
            !unlockedMap[video.id];
          const status = pendingStatus[video.id];

          return (
            <VideoCard
              key={video.id}
              video={video}
              isLocked={isLocked}
              pendingStatus={status}
              onPay={handlePay}
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
