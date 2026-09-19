"use client";

import Image from "next/image";

type LogoSize = "sm" | "default" | "lg";

const dimensions: Record<LogoSize, { wrap: string; image: number }> = {
  sm: { wrap: "h-10 w-28", image: 88 },
  default: { wrap: "h-12 w-36", image: 110 },
  lg: { wrap: "h-16 w-48", image: 150 },
};

export function LwaiLogo({ size = "default", className = "" }: { size?: LogoSize; className?: string }) {
  const d = dimensions[size];

  return (
    <span className={`inline-flex ${d.wrap} items-center ${className}`} aria-label="Bangla Education">
      <Image
        src="/logo.png"
        alt="Bangla Education logo"
        width={d.image}
        height={d.image}
        className="h-full w-auto object-contain"
        priority
      />
    </span>
  );
}

export function LwaiLogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Bangla Education logo"
      width={size}
      height={size}
      className={`rounded-md bg-white object-contain p-0.5 ${className}`}
    />
  );
}
