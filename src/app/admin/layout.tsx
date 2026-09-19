'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileQuestion,
  Users,
  PlusCircle,
  PanelLeft,
  Search,
  LayoutGrid,
  Database,
  Upload,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AdminAuthGuard } from './AdminAuthGuard';
import { UserNav } from './UserNav';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // If we are on the login page, don't render the main admin layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Prevent hydration mismatch by rendering a loader on the server.
  if (!isMounted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <AdminAuthGuard>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
          <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <TooltipProvider>
              <Link
                href="/admin"
                className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
              >
                <Home className="h-4 w-4 transition-all group-hover:scale-110" />
                <span className="sr-only">Admin Dashboard</span>
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/manage-categories"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <LayoutGrid className="h-5 w-5" />
                    <span className="sr-only">Manage Categories</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Manage Categories</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/manage-data"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <Database className="h-5 w-5" />
                    <span className="sr-only">Manage Data</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Manage Data</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/manage-questions"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <FileQuestion className="h-5 w-5" />
                    <span className="sr-only">Manage Questions</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Manage Questions</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/user-reports"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <Users className="h-5 w-5" />
                    <span className="sr-only">User Reports</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">User Reports</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/users"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <Users className="h-5 w-5" />
                    <span className="sr-only">Manage Users</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Manage Users</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/add-new-content"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <PlusCircle className="h-5 w-5" />
                    <span className="sr-only">Add New Content</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Add New Content</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/json-upload"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="sr-only">JSON Upload</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">JSON Upload</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </nav>
          <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          </nav>
        </aside>
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs">
                <SheetTitle className="sr-only">Admin Menu</SheetTitle>
                <nav className="grid gap-6 text-lg font-medium">
                  <Link
                    href="/admin"
                    replace
                    onClick={() => setSheetOpen(false)}
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                  >
                    <Home className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span className="sr-only">Admin</span>
                  </Link>
                  <Link
                    href="/admin/manage-categories"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <LayoutGrid className="h-5 w-5" />
                    Manage Categories
                  </Link>
                  <Link
                    href="/admin/manage-data"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Database className="h-5 w-5" />
                    Manage Data
                  </Link>
                  <Link
                    href="/admin/manage-questions"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <FileQuestion className="h-5 w-5" />
                    Manage Questions
                  </Link>
                  <Link
                    href="/admin/user-reports"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Users className="h-5 w-5" />
                    User Reports
                  </Link>
                  <Link
                    href="/admin/users"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Users className="h-5 w-5" />
                    Manage Users
                  </Link>
                  <Link
                    href="/admin/add-new-content"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Add New Content
                  </Link>
                  <Link
                    href="/admin/json-upload"
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="h-5 w-5" />
                    JSON Upload
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
            <Breadcrumb className="hidden md:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href="/admin">Dashboard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="relative ml-auto flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <UserNav />
          </header>
          <main className="p-4 sm:px-6 sm:py-0">
              {children}
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
