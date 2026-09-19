'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, User, LogOut, Settings } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { LwaiLogo } from "@/components/ui/lwai-logo";

const navLinks = [
  { href: "/", label: "হোম" },
  { href: "/question-bank", label: "প্রশ্ন ব্যাংক" },
  { href: "/mcq-practice", label: "MCQ প্র্যাকটিস" },
  { href: "/textbooks", label: "পাঠ্যবই" },
  { href: "/subjects", label: "বিষয়সমূহ" },
];

export function MainHeader() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return "U";
    if (user.displayName) {
      const names = user.displayName.split(" ");
      return names.map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-teal-900/10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="mr-6 flex items-center group">
          <div className="transition-transform group-hover:scale-105">
            <LwaiLogo size="default" />
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-black md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-slate-600 transition-colors hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          
          {isUserLoading ? (
            // Loading state
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          ) : user ? (
            // Logged in state - Show user avatar with dropdown
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                {/* User Info Section */}
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-t-lg">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 leading-none min-w-0">
                    {user.displayName && (
                      <p className="font-semibold text-base truncate">{user.displayName}</p>
                    )}
                    {user.email && (
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>প্রোফাইল</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>সেটিংস</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>লগ আউট</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Logged out state
            <>
              <Link href="/login" className="hidden sm:inline-flex">
                <Button variant="ghost" className="font-bold text-primary hover:bg-teal-50 hover:text-primary">লগইন</Button>
              </Link>
              <Link href="/signup" className="hidden sm:inline-flex">
                <Button className="rounded-full bg-primary px-5 font-bold text-white hover:bg-teal-800">সাইন আপ</Button>
              </Link>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Link href="/" className="flex items-center">
                <LwaiLogo size="default" />
              </Link>
              <div className="mt-8 grid gap-6 text-lg font-medium">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-slate-700 transition-colors hover:text-primary"
                  >
                    {label}
                  </Link>
                ))}
                
                {/* Mobile auth buttons */}
                {!isUserLoading && !user && (
                  <div className="flex flex-col gap-3 pt-4 border-t">
                    <Link href="/login">
                      <Button variant="outline" className="w-full rounded-full border-primary/20 text-primary">লগইন</Button>
                    </Link>
                    <Link href="/signup">
                      <Button className="w-full rounded-full bg-primary">সাইন আপ</Button>
                    </Link>
                  </div>
                )}
                
                {/* Mobile user info when logged in */}
                {!isUserLoading && user && (
                  <div className="flex flex-col gap-3 pt-4 border-t">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <Avatar className="h-14 w-14 border-2 border-primary/20">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.displayName || "User"}</p>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link href="/profile">
                      <Button variant="outline" className="w-full">
                        <User className="mr-2 h-4 w-4" />
                        প্রোফাইল
                      </Button>
                    </Link>
                    <Button variant="destructive" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      লগ আউট
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
