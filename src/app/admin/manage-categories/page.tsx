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
  Firestore,
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
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  level: z.enum(['ssc', 'hsc']),
  icon: z.string().min(1, 'Icon name is required'),
  description: z.string().min(1, 'Description is required'),
  href: z.string().min(1, 'Link is required'),
});

type Category = z.infer<typeof categorySchema> & { id: string };

export default function ManageCategoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const categoriesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'educationCategories') : null),
    [firestore]
  );
  const { data: categories, isLoading } = useCollection<Omit<Category, 'id'>>(categoriesQuery);

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      level: 'ssc',
      icon: '',
      description: '',
      href: '#',
    },
  });

  const handleDialogOpen = (category: Category | null) => {
    setEditingCategory(category);
    if (category) {
      form.reset(category);
    } else {
      form.reset({
        name: '',
        level: 'ssc',
        icon: 'HelpCircle',
        description: '',
        href: '#',
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (values: z.infer<typeof categorySchema>) => {
    if (!firestore) return;

    const onComplete = () => {
        toast({ title: 'Success', description: `Category ${editingCategory ? 'updated' : 'added'} successfully.` });
        setDialogOpen(false);
        setEditingCategory(null);
    }
    
    if (editingCategory) {
        const docRef = doc(firestore, 'educationCategories', editingCategory.id);
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
        const collRef = collection(firestore, 'educationCategories');
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

  const handleDelete = (categoryId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'educationCategories', categoryId);
    deleteDoc(docRef)
        .then(() => {
            toast({ title: 'Success', description: 'Category deleted successfully.' });
        })
        .catch(() => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
        });
  };


  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-semibold">Manage Categories</h1>
                <p className="text-muted-foreground">Add, edit, or delete home page categories.</p>
            </div>
             <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2" />
                Add New Category
            </Button>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the category. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name (e.g., বিজ্ঞান)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="বিজ্ঞান" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="level"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a level" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="ssc">SSC</SelectItem>
                                    <SelectItem value="hsc">HSC</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                        <Input placeholder="FlaskConical" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="পদার্থ, রসায়ন, জীববিজ্ঞান" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="href"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link</FormLabel>
                                    <FormControl>
                                        <Input placeholder="/ssc/science" {...field} />
                                    </FormControl>
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

        <Card>
            <CardHeader>
                <CardTitle>Existing Categories</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Icon</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                           <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && categories?.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell>{category.name}</TableCell>
                                <TableCell>{category.level.toUpperCase()}</TableCell>
                                <TableCell>{category.icon}</TableCell>
                                <TableCell>{category.description}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(category as Category)}>
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
                                                    This action cannot be undone. This will permanently delete the category.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(category.id)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && categories?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">No categories found. Add one to get started.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
