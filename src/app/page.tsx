
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  query,
  getDocs,
  getDoc,
  setDoc,
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
import { useUser } from '@/firebase';
import { VideoCard } from '@/components/video-card';
import { type Video, type User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
      <div className="absolute right-[calc(0.5rem+env(safe-area-inset-right))] bottom-[calc(7rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-4">
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
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const userCache = useRef<Map<string, User>>(new Map());

  useEffect(() => {
    const updatePageSize = () => setPageSize(resolvePageSize());
    updatePageSize();

    const connection = (navigator as any)?.connection;
    if (connection?.addEventListener) {
      connection.addEventListener('change', updatePageSize);
      return () => connection.removeEventListener('change', updatePageSize);
    }
  }, []);

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

    try {
      const videosQuery = query(
        collection(firestore, 'videos'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      const querySnapshot = await getDocs(videosQuery);
      const newVideos = await buildVideos(querySnapshot.docs);
      setVideos(newVideos);
      setUnlockedMap({});
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? null);
      setHasMore(querySnapshot.docs.length === pageSize);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [firestore, pageSize, buildVideos]);

  const loadMore = useCallback(async () => {
    if (!firestore || loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);

    try {
      const videosQuery = query(
        collection(firestore, 'videos'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
      const querySnapshot = await getDocs(videosQuery);
      const newVideos = await buildVideos(querySnapshot.docs);
      setVideos((prev) => [...prev, ...newVideos]);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] ?? lastDoc);
      setHasMore(querySnapshot.docs.length === pageSize);
    } catch (error) {
      console.error('Error fetching more videos:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [firestore, loadingMore, hasMore, lastDoc, pageSize, buildVideos]);

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

  const handlePay = useCallback(
    async (video: Video, method: 'mobile-money' | 'card' | 'wallet') => {
      if (!authUser) {
        router.push('/login');
        return;
      }
      if (!firestore) return;

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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[520px] md:max-w-[640px]">
        {Array.from({ length: 2 }).map((_, index) => (
          <VideoCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[520px] md:max-w-[640px]">
      {videos.map((video) => {
        const ownerId = (video.userRef as any)?.id ?? video.user?.id;
        const isOwner = authUser && ownerId === authUser.uid;
        const isLocked =
          Boolean((video.isPaid ?? false) || Number(video.price || 0) > 0) &&
          !isOwner &&
          !unlockedMap[video.id];

        return (
          <VideoCard
            key={video.id}
            video={video}
            isLocked={isLocked}
            onPay={handlePay}
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
  );
}
