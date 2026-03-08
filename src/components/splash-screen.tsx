import Image from 'next/image';

export function SplashScreen() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-primary animate-spin-slow">
            <Image
                src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png"
                alt="NeyshaPlay Logo"
                width={96}
                height={96}
                className="object-cover"
                priority
                unoptimized
                suppressHydrationWarning
            />
        </div>
        <h1 className="text-4xl font-bold font-headline text-foreground">
          NeyshaPlay
        </h1>
        <div className="mt-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );
}
