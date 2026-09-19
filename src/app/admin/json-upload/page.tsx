'use client';

import { useState, useRef, useCallback } from 'react';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileJson,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Eye,
  X,
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'chapter-wise', label: 'অধ্যায় ভিত্তিক প্রস্তুতি', href: '/question-bank/chapter-wise' },
  { value: 'board-questions', label: 'বোর্ড প্রশ্ন', href: '/board-questions' },
  { value: 'college-questions', label: 'কলেজ প্রশ্ন', href: '/question-bank/college-questions' },
  { value: 'model-test', label: 'মডেল টেস্ট', href: '/question-bank/model-test' },
  { value: 'university-questions', label: 'ইউনিভার্সিটি প্রশ্ন', href: '/question-bank/university-questions' },
  { value: 'suggestion', label: 'সাজেশন', href: '/question-bank/suggestion' },
];

// Define available collections with metadata
const COLLECTIONS = [
  {
    value: 'boardQuestions',
    label: 'Board Questions (CQ)',
    description: 'Board exam creative questions',
    requiredFields: ['text', 'board', 'year', 'subject', 'class', 'chapter'],
    example: '{ "text": "...", "board": "ঢাকা", "year": 2024, "subject": "পদার্থবিজ্ঞান", "class": "HSC", "chapter": "..." }',
  },
  {
    value: 'mcqs',
    label: 'MCQs',
    description: 'Multiple choice questions',
    requiredFields: ['text', 'options', 'correctAnswer', 'board', 'year', 'subject', 'class', 'chapter'],
    example: '{ "text": "...", "options": ["ক","খ","গ","ঘ"], "correctAnswer": 0, "board": "...", "year": 2024, "subject": "...", "class": "...", "chapter": "..." }',
  },
  {
    value: 'subjects',
    label: 'Subjects',
    description: 'Subject definitions with chapters',
    requiredFields: ['subjectName', 'class', 'group', 'chapters', 'icon', 'isFree'],
    example: '{ "subjectName": "...", "class": "HSC", "group": "বিজ্ঞান", "chapters": [{"name": "..."}], "icon": "Book", "isFree": true }',
  },
  {
    value: 'classes',
    label: 'Classes',
    description: 'Class names (e.g., HSC, SSC)',
    requiredFields: ['name'],
    example: '{ "name": "HSC" }',
  },
  {
    value: 'boards',
    label: 'Boards',
    description: 'Board names (e.g., ঢাকা, রাজশাহী)',
    requiredFields: ['name'],
    example: '{ "name": "ঢাকা" }',
  },
  {
    value: 'groups',
    label: 'Groups',
    description: 'Group names (e.g., বিজ্ঞান, বাণিজ্য)',
    requiredFields: ['name'],
    example: '{ "name": "বিজ্ঞান" }',
  },
  {
    value: 'educationCategories',
    label: 'Education Categories',
    description: 'Homepage education categories',
    requiredFields: ['name'],
    example: '{ "name": "বোর্ড পরীক্ষা", "icon": "GraduationCap", "href": "/board-questions" }',
  },
  {
    value: 'textbooks',
    label: 'Textbook Content',
    description: 'Chapter textbook content (JSON)',
    requiredFields: ['metadata', 'sections'],
    example: '{ "metadata": { "chapter_name": "তড়িৎ রসায়ন" }, "sections": [...], "introduction": {...} }',
  },
];

type UploadStatus = 'idle' | 'parsing' | 'ready' | 'uploading' | 'done' | 'error';

export default function JsonUploadPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('');
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isClearingCollection, setIsClearingCollection] = useState(false);

  const selectedCollectionMeta = COLLECTIONS.find(c => c.value === selectedCollection);
  const selectedQuestionTypeMeta = QUESTION_TYPES.find(t => t.value === selectedQuestionType);
  const shouldChooseQuestionType = selectedCollection === 'boardQuestions' || selectedCollection === 'mcqs';

  const normalizeQuestionData = useCallback((items: any[]) => {
    const boardMapping: Record<string, string> = {
      'DB': 'ঢাকা',
      'RB': 'রাজশাহী',
      'CB': 'কুমিল্লা',
      'JB': 'যশোর',
      'ChB': 'চট্টগ্রাম',
      'BB': 'বরিশাল',
      'SB': 'সিলেট',
      'DiB': 'দিনাজপুর',
      'MSB': 'ময়মনসিংহ',
      'MYB': 'মাদরাসা'
    };

    return items.map((item: any) => {
      const data = { ...item };

      if (data.board && boardMapping[data.board]) {
        data.board = boardMapping[data.board];
      }

      if (selectedQuestionType) {
        data.questionType = selectedQuestionType;
      }

      if (selectedQuestionType === 'university-questions') {
        const universityName = data.universityName || data.university || data.institution || data.board || data.name;
        if (universityName) {
          data.universityName = universityName;
          data.board = universityName;
        }
      }

      if ('correctAnswer' in data && !('correctAnswerIndex' in data)) {
        data.correctAnswerIndex = data.correctAnswer;
      }

      return data;
    });
  }, [selectedQuestionType]);

  const validateRequiredFields = useCallback((data: any[]) => {
    if (!selectedCollectionMeta) return '';
    const firstItem = data[0];
    const missingFields: string[] = [];

    if (selectedCollection === 'boardQuestions' && selectedQuestionType === 'university-questions') {
      for (const field of ['text', 'universityName', 'year']) {
        if (!(field in firstItem)) missingFields.push(field);
      }
    } else if (selectedCollection === 'mcqs' && selectedQuestionType === 'university-questions') {
      for (const field of ['text', 'options', 'year']) {
        if (!(field in firstItem)) missingFields.push(field);
      }
      if (!('universityName' in firstItem) && !('university' in firstItem) && !('board' in firstItem) && !('institution' in firstItem)) {
        missingFields.push('universityName');
      }
      if (!('correctAnswerIndex' in firstItem) && !('correctAnswer' in firstItem)) {
        missingFields.push('correctAnswerIndex');
      }
    } else {
      for (const field of selectedCollectionMeta.requiredFields) {
        if (field === 'correctAnswer' && ('correctAnswerIndex' in firstItem || 'correctAnswer' in firstItem)) {
          continue;
        }
        if (!(field in firstItem)) missingFields.push(field);
      }
    }

    if (missingFields.length === 0) return '';
    return `Missing required fields in the first item: ${missingFields.join(', ')}. Expected format: ${selectedCollectionMeta.example}`;
  }, [selectedCollection, selectedCollectionMeta, selectedQuestionType]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a .json file.',
      });
      return;
    }

    setFileName(file.name);
    setStatus('parsing');
    setErrorMessage('');
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data = JSON.parse(content);

        // Handle common JSON wrappers like { "questions": [...] }, { "data": [...] }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          if (data.questions && Array.isArray(data.questions)) {
            data = data.questions;
          } else if (data.data && Array.isArray(data.data)) {
            data = data.data;
          } else if (data.mcqs && Array.isArray(data.mcqs)) {
            data = data.mcqs;
          } else {
            data = [data];
          }
        } else if (!Array.isArray(data)) {
          data = [data];
        }

        data = normalizeQuestionData(data);

        if (data.length === 0) {
          setStatus('error');
          setErrorMessage('The JSON file contains no data.');
          return;
        }

        // Validate required fields if a collection is selected
        if (selectedCollectionMeta) {
          const validationError = validateRequiredFields(data);
          if (validationError) {
            setStatus('error');
            setErrorMessage(validationError);
            return;
          }
        }

        setParsedData(data);
        setStatus('ready');
        setShowPreview(true);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setErrorMessage('Failed to read the file.');
    };
    reader.readAsText(file);
  }, [normalizeQuestionData, selectedCollectionMeta, toast, validateRequiredFields]);

  const handleUpload = async () => {
    if (!firestore || !selectedCollection || parsedData.length === 0) return;

    setStatus('uploading');
    setProgress(0);
    setUploadedCount(0);

    const collRef = collection(firestore, selectedCollection);
    const total = parsedData.length;
    let uploaded = 0;
    const batchSize = 20; // Process in smaller batches for progress feedback

    try {
      for (let i = 0; i < total; i += batchSize) {
        const chunk = parsedData.slice(i, i + batchSize);
        const batch = writeBatch(firestore);

        for (const item of chunk) {
          const newDocRef = doc(collRef);
          // Add createdAt timestamp for questions
          const dataToUpload = { ...item };
          if (selectedCollection === 'boardQuestions' || selectedCollection === 'mcqs') {
            dataToUpload.createdAt = Timestamp.now();
            if (selectedQuestionType) {
              dataToUpload.questionType = selectedQuestionType;
            }
          }
          // For textbooks, extract chapterName from metadata.chapter_name
          if (selectedCollection === 'textbooks' && item.metadata?.chapter_name) {
            dataToUpload.chapterName = item.metadata.chapter_name;
          }
          batch.set(newDocRef, dataToUpload);
        }

        await batch.commit();
        uploaded += chunk.length;
        setUploadedCount(uploaded);
        setProgress(Math.round((uploaded / total) * 100));
      }

      setStatus('done');
      toast({
        title: '✅ Upload Complete!',
        description: `Successfully uploaded ${total} items to "${selectedCollectionMeta?.label}".`,
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        `Upload failed after ${uploaded} items: ${err instanceof Error ? err.message : 'Permission denied or network error.'}`
      );
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: `Error after uploading ${uploaded}/${total} items. Check permissions.`,
      });
    }
  };

  const handleClearCollection = async () => {
    if (!firestore || !selectedCollection) return;

    setIsClearingCollection(true);

    try {
      const collRef = collection(firestore, selectedCollection);
      const snapshot = await getDocs(collRef);

      if (snapshot.empty) {
        toast({
          title: 'Collection is already empty',
          description: `No documents found in "${selectedCollectionMeta?.label}".`,
        });
        setIsClearingCollection(false);
        return;
      }

      const batchSize = 20;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(firestore);
        const chunk = docs.slice(i, i + batchSize);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }

      toast({
        title: '🗑️ Collection Cleared',
        description: `Deleted ${snapshot.size} documents from "${selectedCollectionMeta?.label}".`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error Clearing Collection',
        description: err instanceof Error ? err.message : 'Permission denied.',
      });
    } finally {
      setIsClearingCollection(false);
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setStatus('idle');
    setProgress(0);
    setUploadedCount(0);
    setErrorMessage('');
    setShowPreview(false);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPreviewColumns = (): string[] => {
    if (parsedData.length === 0) return [];
    const keys = Object.keys(parsedData[0]);
    return keys.slice(0, 6); // Show max 6 columns for preview
  };

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 50) + '...';
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    const str = String(value);
    return str.length > 60 ? str.slice(0, 57) + '...' : str;
  };

  const downloadSampleJson = () => {
    if (!selectedCollectionMeta) return;
    const sample = `[\n  ${selectedCollectionMeta.example}\n]`;
    const blob = new Blob([sample], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCollection}_sample.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">JSON Data Upload</h1>
        <p className="text-muted-foreground">
          Upload JSON files to import data directly into your Firestore collections.
        </p>
      </div>

      {/* Step 1: Select Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </span>
            Select Target Collection
          </CardTitle>
          <CardDescription>
            Choose which Firestore collection you want to upload data to.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={selectedCollection}
            onValueChange={(value) => {
              setSelectedCollection(value);
              setSelectedQuestionType('');
              handleReset();
            }}
          >
            <SelectTrigger className="w-full sm:w-[400px]">
              <SelectValue placeholder="Choose a collection..." />
            </SelectTrigger>
            <SelectContent>
              {COLLECTIONS.map((col) => (
                <SelectItem key={col.value} value={col.value}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{col.label}</span>
                    <span className="text-xs text-muted-foreground">— {col.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCollectionMeta && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Required Fields:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedCollectionMeta.requiredFields.map((field) => (
                      <Badge key={field} variant="secondary" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={downloadSampleJson}>
                  <Download className="mr-2 h-4 w-4" />
                  Sample JSON
                </Button>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Example format:</p>
                <code className="block rounded bg-muted p-2 text-xs overflow-x-auto">
                  {selectedCollectionMeta.example}
                </code>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Question Section */}
      {shouldChooseQuestionType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </span>
              Select Question Section
            </CardTitle>
            <CardDescription>
              Choose where this question set will appear on the frontend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={selectedQuestionType}
              onValueChange={(value) => {
                setSelectedQuestionType(value);
                handleReset();
              }}
            >
              <SelectTrigger className="w-full sm:w-[400px]">
                <SelectValue placeholder="Choose a question section..." />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-muted-foreground">— {type.href}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedQuestionTypeMeta && (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Uploaded questions will be tagged as{' '}
                <Badge variant="secondary" className="mx-1">{selectedQuestionTypeMeta.label}</Badge>
                and shown from <span className="font-medium text-foreground">{selectedQuestionTypeMeta.href}</span>.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload File */}
      {selectedCollection && (!shouldChooseQuestionType || selectedQuestionType) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {shouldChooseQuestionType ? 3 : 2}
              </span>
              Upload JSON File
            </CardTitle>
            <CardDescription>
              Select a JSON file containing an array of objects matching the required format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                status === 'error'
                  ? 'border-destructive/50 bg-destructive/5'
                  : status === 'ready' || status === 'done'
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
                disabled={status === 'uploading'}
              />
              {status === 'idle' && (
                <>
                  <FileJson className="mb-3 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm font-medium">Click or drag to upload a JSON file</p>
                  <p className="text-xs text-muted-foreground mt-1">Only .json files are accepted</p>
                </>
              )}
              {status === 'parsing' && (
                <>
                  <Loader2 className="mb-3 h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm font-medium">Parsing file...</p>
                </>
              )}
              {(status === 'ready' || status === 'done') && (
                <>
                  <CheckCircle2 className="mb-3 h-12 w-12 text-green-500" />
                  <p className="text-sm font-medium text-green-700">{fileName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {parsedData.length} items found — Ready to upload
                  </p>
                  {selectedQuestionTypeMeta && (
                    <Badge variant="secondary" className="mt-2">{selectedQuestionTypeMeta.label}</Badge>
                  )}
                </>
              )}
              {status === 'uploading' && (
                <>
                  <Loader2 className="mb-3 h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm font-medium">Uploading...</p>
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle className="mb-3 h-12 w-12 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="mt-1 max-w-md text-center text-xs text-destructive/80">
                    {errorMessage}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleReset}>
                    Try Again
                  </Button>
                </>
              )}
            </div>

            {/* File actions */}
            {(status === 'ready' || status === 'done') && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <X className="mr-2 h-4 w-4" />
                  Clear File
                </Button>
              </div>
            )}

            {/* Data Preview Table */}
            {showPreview && parsedData.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Preview (showing {Math.min(10, parsedData.length)} of {parsedData.length} items)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {getPreviewColumns().map((col) => (
                          <TableHead key={col}>{col}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                          {getPreviewColumns().map((col) => (
                            <TableCell key={col} className="text-sm max-w-[200px] truncate">
                              {formatCellValue(item[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 10 && (
                  <div className="bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
                    ...and {parsedData.length - 10} more items
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Upload Actions */}
      {status === 'ready' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {shouldChooseQuestionType ? 4 : 3}
              </span>
              Upload to Firestore
            </CardTitle>
            <CardDescription>
              Review the preview above, then upload {parsedData.length} items to the{' '}
              <strong>{selectedCollectionMeta?.label}</strong> collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={handleUpload} size="lg" className="gap-2">
                <Upload className="h-5 w-5" />
                Upload {parsedData.length} Items
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="lg" className="gap-2">
                    <Trash2 className="h-5 w-5" />
                    Clear Collection First
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear "{selectedCollectionMeta?.label}" collection?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete ALL existing documents in the{' '}
                      <strong>{selectedCollectionMeta?.label}</strong> collection before uploading new data.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await handleClearCollection();
                        await handleUpload();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isClearingCollection ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Clear & Upload
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {status === 'uploading' && (
        <Card>
          <CardContent className="py-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Uploading to {selectedCollectionMeta?.label}...</span>
              <span className="text-muted-foreground">
                {uploadedCount} / {parsedData.length}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-xs text-muted-foreground text-center">
              Please do not close this page while the upload is in progress.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upload Complete */}
      {status === 'done' && (
        <Card className="border-green-500/50">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold text-green-700">Upload Complete!</p>
                <p className="text-sm text-muted-foreground">
                  Successfully uploaded {parsedData.length} items to "{selectedCollectionMeta?.label}".
                  The data is now live and visible on the frontend.
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
