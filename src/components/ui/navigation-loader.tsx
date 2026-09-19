'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/ui/page-loader';

export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Stop loading when the path or search params change (navigation completes)
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Intercept anchor clicks to start the loading animation
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      
      // Check if it's a valid internal navigation that should trigger a loader
      if (
        href && 
        href.startsWith('/') && 
        !href.startsWith('#') &&
        href !== pathname &&
        anchor.target !== '_blank' &&
        !anchor.hasAttribute('download') &&
        !e.ctrlKey && 
        !e.metaKey &&
        !e.shiftKey
      ) {
        setIsLoading(true);
      }
    };

    // Use capture phase to ensure we catch clicks before other handlers might stop propagation
    document.addEventListener('click', handleAnchorClick, true);
    
    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
    };
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-background">
      <PageLoader text="লোড হচ্ছে..." />
    </div>
  );
}
