'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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

const dataSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type DataItem = z.infer<typeof dataSchema> & { id: string };

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
    defaultValues: { name: '' },
  });

  const handleDialogOpen = (item: DataItem | null) => {
    setEditingItem(item);
    if (item) {
      form.reset(item);
    } else {
      form.reset({ name: '' });
    }
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof dataSchema>) => {
    if (!firestore) return;

    const onComplete = () => {
        toast({ title: 'Success', description: `${itemTitle} ${editingItem ? 'updated' : 'added'} successfully.` });
        setDialogOpen(false);
        setEditingItem(null);
    }
    
    if (editingItem) {
        const docRef = doc(firestore, collectionName, editingItem.id);
        updateDoc(docRef, values)
            .then(onComplete)
            .catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: values
                }));
            });
    } else {
        const collRef = collection(firestore, collectionName);
        addDoc(collRef, values)
            .then(onComplete)
            .catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: collRef.path,
                    operation: 'create',
                    requestResourceData: values
                }));
            });
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{itemTitle} Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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

export default function SettingsPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Data Configuration</h1>
            <p className="text-muted-foreground">Manage core data like classes, boards, and groups.</p>
            <Tabs defaultValue="classes" className="w-full">
                <TabsList>
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                    <TabsTrigger value="boards">Boards</TabsTrigger>
                    <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>
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
