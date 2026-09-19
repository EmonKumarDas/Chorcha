'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import type { Subject } from '@/types';

const subjectSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required'),
  class: z.string().min(1, 'Class is required'),
  group: z.string().min(1, 'Group is required'),
  totalChapters: z.coerce.number().min(1, 'At least one chapter is required'),
  icon: z.string().min(1, 'Icon name is required'),
  isFree: z.boolean(),
});

type SubjectWithId = Subject & { id: string };

export default function ManageSubjectsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectWithId | null>(null);

  const subjectsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'subjects') : null),
    [firestore]
  );
  const { data: subjects, isLoading } = useCollection<Omit<Subject, 'id'>>(subjectsQuery);
  
  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes } = useCollection(classesQuery);

  const groupsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'groups') : null, [firestore]);
  const { data: groups } = useCollection(groupsQuery);


  const form = useForm<z.infer<typeof subjectSchema>>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      subjectName: '',
      class: '',
      group: '',
      totalChapters: 1,
      icon: 'Book',
      isFree: true,
    },
  });

  const handleDialogOpen = (subject: SubjectWithId | null) => {
    setEditingSubject(subject);
    if (subject) {
      form.reset(subject);
    } else {
      form.reset({
        subjectName: '',
        class: '',
        group: '',
        totalChapters: 1,
        icon: 'Book',
        isFree: true,
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof subjectSchema>) => {
    if (!firestore) return;

    const onComplete = () => {
      toast({ title: 'Success', description: `Subject ${editingSubject ? 'updated' : 'added'} successfully.` });
      setDialogOpen(false);
      setEditingSubject(null);
    };

    if (editingSubject) {
      const docRef = doc(firestore, 'subjects', editingSubject.id);
      updateDoc(docRef, values)
        .then(onComplete)
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: values,
          }));
        });
    } else {
      const collRef = collection(firestore, 'subjects');
      addDoc(collRef, values)
        .then(onComplete)
        .catch(() => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: collRef.path,
            operation: 'create',
            requestResourceData: values,
          }));
        });
    }
  };

  const handleDelete = (subjectId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'subjects', subjectId);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Success', description: 'Subject deleted successfully.' });
      })
      .catch(() => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        }));
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manage Subjects</h1>
          <p className="text-muted-foreground">Add, edit, or delete subjects for the selection grid.</p>
        </div>
        <Button onClick={() => handleDialogOpen(null)}>
          <PlusCircle className="mr-2" />
          Add New Subject
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the subject. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="subjectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name (e.g., উচ্চতর গণিত)</FormLabel>
                    <FormControl>
                      <Input placeholder="উচ্চতর গণিত" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes?.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel>Group</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {groups?.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="totalChapters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chapter Count</FormLabel>
                    <FormControl>
                      <Input type="number" onChange={e => field.onChange(parseInt(e.target.value))} value={field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Name (from lucide-react)</FormLabel>
                    <FormControl>
                      <Input placeholder="Beaker" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isFree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Status</FormLabel>
                      <FormDescription>Is this subject free for all users?</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Existing Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                </TableRow>
              ))}
              {!isLoading && subjects?.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.subjectName}</TableCell>
                  <TableCell>{(subject.class as string).toUpperCase()}</TableCell>
                  <TableCell className="capitalize">{subject.group as string}</TableCell>
                  <TableCell>{subject.isFree ? 'Free' : 'Paid'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(subject as SubjectWithId)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the subject.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(subject.id)}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && subjects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No subjects found. Add one to get started.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
