'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isUserLoading } = useUser();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isUserLoading && user) {
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl);
    }
  }, [user, isUserLoading, router, searchParams]);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (firestore) {
        let localDeviceId = localStorage.getItem('activeDeviceId');
        if (!localDeviceId) {
          localDeviceId = crypto.randomUUID();
          localStorage.setItem('activeDeviceId', localDeviceId);
        }

        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: user.displayName || 'Student',
            email: user.email,
            photoURL: user.photoURL,
            role: 'student',
            createdAt: new Date().toISOString(),
            activeDeviceId: localDeviceId,
          });
        } else {
          // Update user info on each login
          await setDoc(userRef, {
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            lastLoginAt: new Date().toISOString(),
            activeDeviceId: localDeviceId,
          }, { merge: true });
        }
      }

      toast({
        title: 'লগইন সফল হয়েছে',
        description: `স্বাগতম, ${user.displayName || 'শিক্ষার্থী'}!`,
      });
      const redirectUrl = searchParams.get('redirect') || '/';
      router.push(redirectUrl);
    } catch (error: any) {
      let errorMessage = error.message || 'অপ্রত্যাশিত একটি সমস্যা হয়েছে।';
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'এই ডোমেইনটি Firebase-এ অনুমোদিত নয়। অনুগ্রহ করে Firebase কনসোলের "Authorized domains" এ আপনার ডোমেইন যুক্ত করুন।';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google লগইন সাময়িকভাবে বন্ধ আছে। Firebase কনসোল থেকে এটি চালু করুন।';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'লগইন সম্পূর্ণ হওয়ার আগেই পপআপ বন্ধ করা হয়েছে।';
      }
      toast({
        variant: 'destructive',
        title: 'লগইন ব্যর্থ হয়েছে',
        description: errorMessage,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isUserLoading) {
    return <PageLoader />;
  }

  // Don't render login form if already logged in
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4">
      <Card className="mx-auto w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto">
            <Image 
              src="/logo.png" 
              alt="Bangla Education Hub" 
              width={100} 
              height={100}
              className="mx-auto"
              priority
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">স্বাগতম!</CardTitle>
            <CardDescription className="text-base mt-2">
              Bangla Education Hub এ লগইন করুন
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            variant="outline" 
            type="button" 
            className="w-full h-12 text-base font-medium hover:bg-primary/5 border-2" 
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="mr-3 h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            {isLoggingIn ? 'লগইন হচ্ছে...' : 'Google দিয়ে লগইন করুন'}
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            লগইন করার মাধ্যমে আপনি আমাদের{' '}
            <Link href="/terms" className="text-primary underline hover:no-underline">
              শর্তাবলী
            </Link>{' '}
            ও{' '}
            <Link href="/privacy" className="text-primary underline hover:no-underline">
              গোপনীয়তা নীতি
            </Link>{' '}
            মেনে নিচ্ছেন।
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
