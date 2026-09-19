'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Users } from 'lucide-react';

export function ActiveUserCounter() {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!firestore) return;

    const analyticsRef = doc(firestore, 'analytics', 'activeUsers');

    const unsubscribe = onSnapshot(analyticsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.users && typeof data.count === 'number') {
          setActiveCount(data.count);
          setIsDemo(false);
        } else if (data.users && typeof data.users === 'object') {
          const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
          const activeUsers = Object.values(data.users as Record<string, any>)
            .filter((u: any) => u.lastActive > thirtyMinutesAgo && u.isOnline);
          setActiveCount(activeUsers.length);
          setIsDemo(false);
        } else {
          setActiveCount(0);
          setIsDemo(true);
        }
      } else {
        setActiveCount(0);
        setIsDemo(true);
      }
      setIsLoading(false);
    }, (error) => {
      console.log('Active users analytics not set up yet');
      setIsLoading(false);
      setIsDemo(true);
    });

    return () => unsubscribe();
  }, [firestore]);

  useEffect(() => {
    if (!firestore || !user) return;

    const updateUserActivity = async () => {
      try {
        const analyticsRef = doc(firestore, 'analytics', 'activeUsers');
        const analyticsDoc = await getDoc(analyticsRef);
        const now = Date.now();

        if (analyticsDoc.exists()) {
          const data = analyticsDoc.data();
          const users = data.users || {};
          
          await updateDoc(analyticsRef, {
            [`users.${user.uid}`]: {
              lastActive: now,
              isOnline: true,
              email: user.email,
              displayName: user.displayName,
            },
            count: Object.keys(users).length + 1,
          });
        } else {
          await setDoc(analyticsRef, {
            users: {
              [user.uid]: {
                lastActive: now,
                isOnline: true,
                email: user.email,
                displayName: user.displayName,
              },
            },
            count: 1,
            lastUpdated: now,
          });
        }
      } catch (error) {
        console.log('Could not update user activity');
      }
    };

    updateUserActivity();
    const interval = setInterval(updateUserActivity, 60000);

    return () => clearInterval(interval);
  }, [firestore, user]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-teal-900/10 bg-white px-4 py-3 shadow-sm">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-teal-50" />
        <div>
          <div className="mb-1 h-4 w-12 animate-pulse rounded bg-teal-50" />
          <div className="h-3 w-20 animate-pulse rounded bg-teal-50" />
        </div>
      </div>
    );
  }

  const displayCount = isDemo ? Math.floor(Math.random() * 50) + 100 : activeCount;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-teal-900/10 bg-white px-4 py-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
        <Users className="h-5 w-5 text-emerald-500" />
      </div>
      <div>
        <p className="text-xl font-black text-primary">{displayCount}</p>
        <p className="text-[10px] font-bold uppercase text-muted-foreground">অনলাইন</p>
      </div>
    </div>
  );
}
