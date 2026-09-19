"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "হোম", icon: Home },
  { href: "/question-bank", label: "প্রশ্ন", icon: BookMarked },
  { href: "/profile", label: "প্রোফাইল", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 z-50 w-full border-t bg-background/95 p-2 backdrop-blur-sm sm:hidden">
      <div className="grid h-full max-w-lg grid-cols-3 mx-auto">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={label} href={href} className="inline-flex flex-col items-center justify-center font-medium">
              <div className={cn(
                  "inline-flex flex-col items-center justify-center rounded-lg p-2 transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
