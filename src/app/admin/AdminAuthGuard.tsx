'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { UserProfile } from '@/types';
import { doc } from 'firebase/firestore';
import { PageLoader } from '@/components/ui/page-loader';

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


/**
 * Ensures that only authenticated users with an 'admin' role can access the
 * routes wrapped by this component.
 *
 * If a user is not an admin, they are redirected to the login page.
 * A loading state is displayed while authentication and role verification are
 * in progress.
 */
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If we're done loading and the user is not an admin, redirect to login.
    // The redirect URL is appended so the user can be sent back after logging in.
    if (!isLoading && !isAdmin) {
      router.replace(`/admin/login?redirect=${pathname}`);
    }
  }, [isLoading, isAdmin, router, pathname]);

  // While loading, or if the user is not an admin (and is about to be redirected),
  // show a loading screen. This prevents a flash of admin content for non-admin users.
  if (isLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <PageLoader text="অ্যাডমিন ভেরিফিকেশন..." />
      </div>
    );
  }

  // If loading is complete and the user is a verified admin, render the children.
  return <>{children}</>;
}
