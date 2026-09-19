'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
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
  AlertDialogTrigger,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Subject } from '@/types';


// Part 1: Generic Data Management for Class, Board, Group (from settings page)

const dataSchema = z.object({
  names: z.string().min(1, 'Name(s) are required'),
});

type DataItem = { id: string; name: string; };

interface DataManagementTableProps {
    collectionName: string;
    itemTitle: string;
}

function DataManagementTable({ collectionName, itemTitle }: DataManagementTableProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);

  const dataQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, collectionName) : null),
    [firestore, collectionName]
  );
  const { data: items, isLoading } = useCollection<Omit<DataItem, 'id'>>(dataQuery);

  const form = useForm<z.infer<typeof dataSchema>>({
    resolver: zodResolver(dataSchema),
    defaultValues: { names: '' },
  });

  const handleDialogOpen = (item: DataItem | null) => {
    setEditingItem(item);
    form.reset({ names: item ? item.name : '' });
    setDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof dataSchema>) => {
    if (!firestore) return;

    const onComplete = (count: number) => {
        toast({ title: 'Success', description: `${count} ${itemTitle}(s) ${editingItem ? 'updated' : 'added'} successfully.` });
        setDialogOpen(false);
        setEditingItem(null);
    }
    
    if (editingItem) {
        const docRef = doc(firestore, collectionName, editingItem.id);
        updateDoc(docRef, { name: values.names.trim() })
            .then(() => onComplete(1))
            .catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: { name: values.names.trim() }
                }));
            });
    } else {
        const collRef = collection(firestore, collectionName);
        const names = values.names.split('\n').map(n => n.trim()).filter(Boolean);
        let successCount = 0;
        for (const name of names) {
            try {
                await addDoc(collRef, { name });
                successCount++;
            } catch (e) {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: collRef.path,
                    operation: 'create',
                    requestResourceData: { name }
                }));
                toast({ variant: 'destructive', title: `Error adding "${name}"`, description: 'Permission denied or network issue.' });
                return; // Stop processing on first error
            }
        }
        if (successCount > 0) {
            onComplete(successCount);
        }
    }
  };

  const handleDelete = (itemId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, collectionName, itemId);
    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'Success', description: `${itemTitle} deleted successfully.` });
        })
        .catch(() => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
        });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Existing {itemTitle}s</CardTitle>
        <Button onClick={() => handleDialogOpen(null)} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New {itemTitle}
        </Button>
      </CardHeader>
      <CardContent>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit' : 'Add New'} {itemTitle}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="names"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{editingItem ? `${itemTitle} Name` : `New ${itemTitle}(s)`}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={editingItem ? '' : 'One name per line...'} {...field} rows={editingItem ? 1 : 5} />
                      </FormControl>
                      {!editingItem && <FormDescription>Enter one name per line to add multiple items at once.</FormDescription>}
                      <FormMessage />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2}><Skeleton className="h-4 w-1/2" /></TableCell>
              </TableRow>
            )}
            {!isLoading && items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item as DataItem)}>
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
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the {itemTitle.toLowerCase()}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(item.id)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && items?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center h-24">No {itemTitle.toLowerCase()}s found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Part 2: Subject Management (from manage-subjects page)
const chapterSchema = z.object({
  name: z.string().min(1, "Chapter name can't be empty"),
});

const subjectSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required'),
  class: z.string().min(1, 'Class is required'),
  group: z.string().min(1, 'Group is required'),
  chapters: z.array(chapterSchema).min(1, 'At least one chapter is required'),
  icon: z.string().min(1, 'Icon name is required'),
  isFree: z.boolean(),
});

type SubjectWithId = Subject & { id: string };

function SubjectsManagementTab() {
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
      chapters: [{ name: '' }],
      icon: 'Book',
      isFree: true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "chapters",
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
        chapters: [{ name: '' }],
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
    <Card>
        <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Existing Subjects</CardTitle>
            <Button onClick={() => handleDialogOpen(null)} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
            </Button>
        </CardHeader>
        <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
                    
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <FormLabel>Chapters</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '' })}>
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Chapter
                        </Button>
                      </div>
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                           <FormField
                              control={form.control}
                              name={`chapters.${index}.name`}
                              render={({ field }) => (
                                  <FormItem className="flex-1">
                                      <FormControl>
                                          <Input placeholder={`Chapter ${index + 1} name`} {...field} />
                                      </FormControl>
                                      <FormMessage />
                                  </FormItem>
                              )}
                          />
                          {fields.length > 1 && (
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>


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
  )
}


// Part 3: Main Page Component

export default function ManageDataPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Manage Core Data</h1>
            <p className="text-muted-foreground">Manage classes, boards, groups, and subjects.</p>
            <Tabs defaultValue="subjects" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                    <TabsTrigger value="boards">Boards</TabsTrigger>
                    <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>
                <TabsContent value="subjects" className="mt-4">
                    <SubjectsManagementTab />
                </TabsContent>
                <TabsContent value="classes" className="mt-4">
                    <DataManagementTable collectionName="classes" itemTitle="Class" />
                </TabsContent>
                <TabsContent value="boards" className="mt-4">
                    <DataManagementTable collectionName="boards" itemTitle="Board" />
                </TabsContent>
                <TabsContent value="groups" className="mt-4">
                    <DataManagementTable collectionName="groups" itemTitle="Group" />
                </TabsContent>
            </Tabs>
        </div>
    )
}
