'use client';

import { useEffect, useState, ReactNode } from 'react';
import { AlertTriangle, ShieldOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/types';
import { PageLoader } from '@/components/ui/page-loader';

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  // Fetch user profile to check admin role
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  useEffect(() => {
    if (!isUserLoading && userProfile) {
      setIsAdmin(userProfile.role === 'admin');
      setIsCheckingAdmin(false);

      // Single device restriction logic
      const checkDevice = async () => {
        let localDeviceId = localStorage.getItem('activeDeviceId');
        if (!localDeviceId) {
          localDeviceId = crypto.randomUUID();
          localStorage.setItem('activeDeviceId', localDeviceId);
        }

        const firestoreDeviceId = userProfile.activeDeviceId;

        if (!firestoreDeviceId) {
          // New user or no active device, bind this device to profile
          if (firestore && user) {
            try {
              await updateDoc(doc(firestore, 'users', user.uid), { activeDeviceId: localDeviceId });
            } catch (err) {
              console.error('Failed to bind device', err);
            }
          }
        } else if (firestoreDeviceId !== localDeviceId) {
          // This device is different from the active one in Firestore. Log out!
          const { getAuth, signOut } = await import('firebase/auth');
          const auth = getAuth();
          if (auth.currentUser) {
            await signOut(auth);
            localStorage.removeItem('activeDeviceId');
            window.location.reload();
          }
        }
      };
      
      checkDevice();

    } else if (!isUserLoading && !user) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
    }
  }, [user, userProfile, isUserLoading, firestore]);

  useEffect(() => {
    // Check for ad blocker (skip for admin users in development)
    const checkAdBlocker = async () => {
      setIsChecking(true);
      
      // Skip ad blocker check for development or if user is admin
      const isDev = process.env.NODE_ENV === 'development';
      
      // Wait for admin check to complete
      if (isDev || isAdmin) {
        setAdBlockerDetected(false);
        setIsChecking(false);
        return;
      }
      
      try {
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox ad-banner ad-placeholder pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-text adSense adBlock';
        testAd.style.cssText = 'position: absolute; top: -10px; left: -10px; width: 1px; height: 1px;';
        document.body.appendChild(testAd);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const isBlocked = testAd.offsetHeight === 0 || 
                          testAd.offsetParent === null || 
                          testAd.clientHeight === 0 ||
                          getComputedStyle(testAd).display === 'none';
        
        document.body.removeChild(testAd);
        
        const testScript = document.createElement('script');
        testScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        testScript.async = true;
        
        const scriptBlocked = await new Promise<boolean>((resolve) => {
          testScript.onerror = () => resolve(true);
          testScript.onload = () => resolve(false);
          document.head.appendChild(testScript);
          setTimeout(() => resolve(true), 2000);
        });
        
        try { document.head.removeChild(testScript); } catch (e) {}
        
        setAdBlockerDetected(isBlocked || scriptBlocked);
      } catch (error) {
        setAdBlockerDetected(true);
      }
      
      setIsChecking(false);
    };

    checkAdBlocker();
  }, [isAdmin]);

  useEffect(() => {
    // For admin users, allow all interactions
    if (isAdmin) {
      document.body.style.userSelect = 'text';
      document.body.style.webkitUserSelect = 'text';
      document.body.style.msUserSelect = 'text';
      document.body.dataset.admin = 'true';
      return;
    }
    
    // For non-admin users, apply security measures
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.dataset.admin = 'false';

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const preventKeyShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.key === 'a') ||
        (e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        return false;
      }
    };

    const preventDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const preventSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return true;
      }
      e.preventDefault();
      return false;
    };

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; text-align: center; padding: 20px;">
            <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 500px;">
              <div style="font-size: 60px; margin-bottom: 20px;">🛡️</div>
              <h1 style="font-size: 24px; margin-bottom: 16px;">নিরাপত্তা সতর্কতা</h1>
              <p style="font-size: 16px; opacity: 0.8; margin-bottom: 24px;">ডেভেলপার টুলস ব্যবহার করা নিষিদ্ধ। অনুগ্রহ করে ডেভেলপার টুলস বন্ধ করে পেজটি রিফ্রেশ করুন।</p>
              <button onclick="location.reload()" style="background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">পেজ রিফ্রেশ করুন</button>
            </div>
          </div>
        `;
      }
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyShortcuts);
    document.addEventListener('dragstart', preventDragStart);
    document.addEventListener('selectstart', preventSelectStart);
    
    const devToolsInterval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyShortcuts);
      document.removeEventListener('dragstart', preventDragStart);
      document.removeEventListener('selectstart', preventSelectStart);
      clearInterval(devToolsInterval);
    };
  }, [isAdmin]);

  const handleRetryCheck = () => {
    window.location.reload();
  };

  // Show loading while checking both ad blocker and admin status
  if (isChecking || isCheckingAdmin) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <PageLoader text="লোড হচ্ছে..." />
      </div>
    );
  }

  // Ad blocker warning screen (applies to all users including admin)
  if (adBlockerDetected) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="mx-4 max-w-lg rounded-3xl bg-white/10 backdrop-blur-xl p-8 text-center text-white shadow-2xl border border-white/20">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20">
            <ShieldOff className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="mb-4 text-2xl font-bold">Ad Blocker সনাক্ত হয়েছে!</h1>
          <p className="mb-6 text-white/80 leading-relaxed">
            আমাদের ওয়েবসাইট বিনামূল্যে চালাতে বিজ্ঞাপন থেকে আয় প্রয়োজন। 
            অনুগ্রহ করে আপনার Ad Blocker বন্ধ করুন এবং পুনরায় চেষ্টা করুন।
          </p>
          
          <div className="mb-6 rounded-xl bg-white/5 p-4 text-left text-sm">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              কিভাবে বন্ধ করবেন:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-white/70">
              <li>ব্রাউজারের এক্সটেনশন আইকনে ক্লিক করুন</li>
              <li>Ad Blocker এক্সটেনশন খুঁজুন</li>
              <li>এই সাইটের জন্য বন্ধ করুন বা Disable করুন</li>
              <li>পেজ রিফ্রেশ করুন</li>
            </ol>
          </div>
          
          <Button 
            onClick={handleRetryCheck}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Ad Blocker বন্ধ করেছি, আবার চেষ্টা করুন
          </Button>
          
          <p className="mt-4 text-xs text-white/50">
            আমাদের সাইটকে সাপোর্ট করার জন্য ধন্যবাদ!
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}