'use client';

import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/splash-screen';
import { AgeGate } from '@/components/age-gate';
import { AppLayout } from './layout/app-layout';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const MIN_SPLASH_TIME = 2000; // 2 seconds

export function AppGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'age-gate' | 'ready'>('loading');
  const [isSplashTimeOver, setIsSplashTimeOver] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);
    
    // Check local storage for age verification
    try {
      const storedAgeVerification = localStorage.getItem('isAgeVerified');
      setIsAgeVerified(storedAgeVerification === 'true');
    } catch (error) {
      setIsAgeVerified(false);
    }

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
    try {
      localStorage.setItem('isAgeVerified', 'true');
    } catch (error) {
       console.warn('Could not save age verification to localStorage');
    }
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
      <AppLayout>{children}</AppLayout>
    </FirebaseClientProvider>
  );
}
