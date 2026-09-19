import { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import 'katex/dist/katex.min.css';
import { Toaster } from '@/components/ui/toaster';
import { MainHeader } from '@/components/layout/main-header';
import { MainFooter } from '@/components/layout/main-footer';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SecurityProvider } from '@/components/security/SecurityProvider';
import { NavigationLoader } from '@/components/ui/navigation-loader';

export const metadata: Metadata = {
  title: 'Bangla Education — স্মার্ট পরীক্ষা প্রস্তুতি',
  description: 'বোর্ড প্রশ্ন, MCQ, মক টেস্ট এবং AI-চালিত ব্যাখ্যা একসাথে। বাংলায় আপনার প্রস্তুতি হোক আরও স্মার্ট ও নির্ভুল।',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased min-h-screen relative" suppressHydrationWarning>
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>

        <FirebaseClientProvider>
          <SecurityProvider>
            <div className="relative flex min-h-screen flex-col z-10">
              <MainHeader />
              <main className="flex-1">{children}</main>
              <MainFooter />
            </div>
            <Toaster />
          </SecurityProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
