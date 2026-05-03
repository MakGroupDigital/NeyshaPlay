'use client';

import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/splash-screen';
import { AgeGate } from '@/components/age-gate';
import { AppLayout } from './layout/app-layout';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { GenderGate } from '@/components/gender-gate';
import { AuthBootstrap } from '@/components/auth-bootstrap';
import { KycStatusWatcher } from '@/components/kyc-status-watcher';
import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';

const MIN_SPLASH_TIME = 2000; // 2 seconds

export function AppGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'age-gate' | 'ready'>('loading');
  const [isSplashTimeOver, setIsSplashTimeOver] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);
    setIsAgeVerified(false);

    // Splash screen timer
    const timer = setTimeout(() => {
      setIsSplashTimeOver(true);
    }, MIN_SPLASH_TIME);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (!isSplashTimeOver) {
      setStatus('loading');
      return;
    }
    
    if (isAgeVerified) {
      setStatus('ready');
    } else {
      setStatus('age-gate');
    }

  }, [isSplashTimeOver, isAgeVerified, isClient]);

  const handleAgeVerified = () => {
    setIsAgeVerified(true);
    setStatus('ready');
  };

  // Render splash screen during SSR and initial client load
  if (!isClient || status === 'loading') {
    return <SplashScreen />;
  }

  if (status === 'age-gate') {
    return <AgeGate onVerified={handleAgeVerified} />;
  }

  return (
    <FirebaseClientProvider>
      <AuthBootstrap />
      <KycStatusWatcher />
      <HomeRedirect />
      <GenderGate>
        <AppLayout>{children}</AppLayout>
      </GenderGate>
    </FirebaseClientProvider>
  );
}

function HomeRedirect() {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) return
    if (pathname && pathname !== '/' && pathname.startsWith('/login')) {
      router.replace('/')
    }
  }, [user, loading, pathname, router])

  return null
}
