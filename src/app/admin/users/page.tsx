'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Users,
  Shield,
  UserCircle,
  MoreVertical,
  Edit,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserPlus,
  Crown,
  ArrowUpDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ITEMS_PER_PAGE = 15;

export default function UsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch all users
  const usersQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'users'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  const { data: usersData, isLoading: usersLoading } = useCollection(usersQuery);

  // Get current user profile to check admin status
  const currentUserProfileRef = useMemoFirebase(
    () => currentUser ? doc(firestore, 'users', currentUser.uid) : null,
    [firestore, currentUser]
  );
  const { data: currentUserProfile } = useDoc<UserProfile>(currentUserProfileRef);
  const isAdmin = currentUserProfile?.role === 'admin';

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    
    return usersData.filter((user: any) => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = searchLower === '' ||
        (user.displayName && user.displayName.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower));
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [usersData, searchTerm, roleFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!usersData) return { total: 0, admins: 0, students: 0 };
    return {
      total: usersData.length,
      admins: usersData.filter((u: any) => u.role === 'admin').length,
      students: usersData.filter((u: any) => u.role === 'student').length,
    };
  }, [usersData]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useMemo(() => { setCurrentPage(1); }, [searchTerm, roleFilter]);

  // Get user initials
  const getUserInitials = (user: any) => {
    if (user.displayName) {
      const names = user.displayName.split(' ');
      return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle role change
  const handleRoleChange = async () => {
    if (!firestore || !selectedUser) return;
    
    setIsUpdating(true);
    try {
      const userRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userRef, { role: selectedUser.newRole });
      
      toast({ 
        title: 'সফল', 
        description: `ব্যবহারকারীর ভূমিকা ${selectedUser.newRole === 'admin' ? 'অ্যাডমিন' : 'শিক্ষার্থী'} তে পরিবর্তন করা হয়েছে।` 
      });
      
      setShowRoleDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({ 
        variant: 'destructive',
        title: 'ত্রুটি', 
        description: error.message || 'ভূমিকা পরিবর্তন করতে ব্যর্থ হয়েছে।' 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Open role change dialog
  const openRoleDialog = (user: any) => {
    setSelectedUser({ ...user, newRole: user.role });
    setShowRoleDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Image 
              src="/logo.png" 
              alt="Logo" 
              fill
              className="object-contain p-2"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ব্যবহারকারী পরিচালনা</h1>
            <p className="text-muted-foreground">সমস্ত ব্যবহারকারী দেখুন এবং পরিচালনা করুন</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="flex gap-3">
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">মোট</p>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">অ্যাডমিন</p>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{stats.students}</p>
              <p className="text-xs text-muted-foreground">শিক্ষার্থী</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">ফিল্টার</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="নাম বা ইমেইল দ্বারা অনুসন্ধান..." 
                className="h-10 pl-12 pr-4 rounded-lg border-border/60"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select onValueChange={setRoleFilter} value={roleFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-lg">
                <SelectValue placeholder="ভূমিকা" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সকল ভূমিকা</SelectItem>
                <SelectItem value="admin">অ্যাডমিন</SelectItem>
                <SelectItem value="student">শিক্ষার্থী</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="pb-4 border-b">
          <Badge variant="outline" className="px-3 py-1.5 text-sm bg-card w-fit">
            <span className="font-bold text-primary">{filteredUsers.length}</span> জন ব্যবহারকারী
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">ব্যবহারকারী</TableHead>
                  <TableHead className="font-semibold">ইমেইল</TableHead>
                  <TableHead className="font-semibold">ভূমিকা</TableHead>
                  <TableHead className="font-semibold">নিবন্ধিত</TableHead>
                  <TableHead className="font-semibold">শেষ লগইন</TableHead>
                  <TableHead className="text-right font-semibold">কার্যক্রম</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-56" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))}
                {!usersLoading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!usersLoading && paginatedUsers.map((user: any) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/10">
                          <AvatarImage src={user.photoURL} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.displayName || 'নাম নেই'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground/70" />
                        {user.email || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className={`rounded-full ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : ''}`}
                      >
                        {user.role === 'admin' ? 'অ্যাডমিন' : 'শিক্ষার্থী'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground/70" />
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground/70" />
                        {formatDate(user.lastLoginAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin && user.id !== currentUser?.uid && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openRoleDialog(user)}
                          className="rounded-lg hover:bg-primary/10"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          পরিবর্তন
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {!usersLoading && filteredUsers.length > 0 && (
            <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
              <p className="text-sm text-muted-foreground">
                দেখাচ্ছে <span className="font-medium">{startItem}-{endItem}</span> / <span className="font-medium">{filteredUsers.length}</span> জন
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => p - 1)} 
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  পৃষ্ঠা {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => p + 1)} 
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>ভূমিকা পরিবর্তন করুন</DialogTitle>
            <DialogDescription>
              {selectedUser?.displayName || selectedUser?.email} এর ভূমিকা পরিবর্তন করতে চাইছেন?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select 
              value={selectedUser?.newRole} 
              onValueChange={(value) => setSelectedUser((prev: any) => ({ ...prev, newRole: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ভূমিকা নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">শিক্ষার্থী</SelectItem>
                <SelectItem value="admin">অ্যাডমিন</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)} className="rounded-lg">
              বাতিল
            </Button>
            <Button onClick={handleRoleChange} disabled={isUpdating} className="rounded-lg">
              {isUpdating ? 'পরিবর্তন হচ্ছে...' : 'পরিবর্তন করুন'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}