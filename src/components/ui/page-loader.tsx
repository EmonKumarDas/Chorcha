'use client';

export function PageLoader({ text = 'লোড হচ্ছে...' }: { text?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="page-loader">
        <div className="loader-logo">
          <div className="loader-ring" />
          <div className="loader-ring" />
          <div className="loader-ring" />
          <span className="text-lg font-extrabold text-primary tracking-tight">
            LW
          </span>
        </div>
        <p className="loader-text">{text}</p>
      </div>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="loader-ring" style={{ borderWidth: '2px' }} />
          <div className="loader-ring" style={{ borderWidth: '2px', inset: '4px' }} />
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">লোড হচ্ছে...</span>
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="h-[72px] rounded-2xl bg-white/5 skeleton-shimmer"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
