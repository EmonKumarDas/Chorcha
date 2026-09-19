'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserProfile } from '@/types';
import React, { useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/page-loader';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// This hook checks the user's authentication and admin status.
function useIsAdmin() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const prevUserId = useRef<string | null>(null);

  const userProfileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading, isLoaded: isProfileLoaded } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    prevUserId.current = user ? user.uid : null;
  });

  const isUserJustLoaded = !prevUserId.current && !!user;
  const isAdmin = !!userProfile && userProfile.role === 'admin';
  const isLoading = isAuthLoading || isUserJustLoaded || (!!user && !isProfileLoaded) || isProfileLoading;

  return { isAdmin, isLoading };
}

export default function AdminLoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isLoading } = useIsAdmin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      const userProfileRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(userProfileRef);

      // Auto-fix for first-time admin setup if profile creation failed during signup
      if (!docSnap.exists()) {
        let localDeviceId = localStorage.getItem('activeDeviceId');
        if (!localDeviceId) {
          localDeviceId = crypto.randomUUID();
          localStorage.setItem('activeDeviceId', localDeviceId);
        }

        await setDoc(userProfileRef, {
          displayName: user.displayName || "System Admin",
          role: "admin",
          activeDeviceId: localDeviceId
        });
        toast({
            title: 'Login Successful',
            description: 'Admin profile created automatically. Redirecting to dashboard...',
        });
        const redirectUrl = searchParams.get('redirect') || '/admin';
        router.replace(redirectUrl);
        return;
      }

      if (docSnap.exists() && docSnap.data().role === 'admin') {
        let localDeviceId = localStorage.getItem('activeDeviceId');
        if (!localDeviceId) {
          localDeviceId = crypto.randomUUID();
          localStorage.setItem('activeDeviceId', localDeviceId);
        }

        await setDoc(userProfileRef, {
            activeDeviceId: localDeviceId,
        }, { merge: true });

        toast({
            title: 'Login Successful',
            description: 'Redirecting to dashboard...',
        });
        const redirectUrl = searchParams.get('redirect') || '/admin';
        router.replace(redirectUrl);
        return;
      }

      await signOut(auth);
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'You do not have permission to access the admin panel.',
      });

    } catch (error: any) {
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/invalid-credential') {
          description = 'The email or password you entered is incorrect. Please double-check your credentials and try again.';
      } else if (error.message) {
          description = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: description,
      });
    }
  };

  // While we are checking auth status, show a full-screen loader.
  if (isLoading) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <PageLoader />
          </div>
      );
  }

  // If the user is already confirmed to be an admin, show a message and a link
  // to the dashboard instead of the login form. This prevents the redirect loop.
  if (isAdmin) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Card className="mx-auto max-w-sm text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">Already Logged In</CardTitle>
                    <CardDescription>
                        You are already logged in as an administrator.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href={searchParams.get('redirect') || '/admin'}>Go to Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  // If we are done loading and the user is not an admin, show the login form.
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
