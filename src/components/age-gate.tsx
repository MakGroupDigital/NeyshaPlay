'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type AgeGateProps = {
  onVerified: () => void;
};

export function AgeGate({ onVerified }: AgeGateProps) {

  const handleDecline = () => {
    window.location.href = 'https://www.google.com';
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
           <div className="mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full border-4 border-primary animate-spin-slow">
                <Image
                    src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png"
                    alt="NeyshaPlay Logo"
                    width={80}
                    height={80}
                    className="object-cover"
                    suppressHydrationWarning
                />
            </div>
          <CardTitle className="text-2xl font-headline">Vérification de l'âge</CardTitle>
          <CardDescription>
            Vous devez avoir au moins 18 ans pour utiliser NeyshaPlay.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm">
                En entrant, vous confirmez que vous avez 18 ans ou plus.
            </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button size="lg" className="w-full text-lg" onClick={onVerified}>
            J'ai 18 ans ou plus
          </Button>
           <Button size="lg" variant="outline" className="w-full text-lg" onClick={handleDecline}>
            Quitter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
