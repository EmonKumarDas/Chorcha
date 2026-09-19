
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PlusCircle, Trash2, Upload, Sigma, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Subject } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MathRenderer from '@/components/MathRenderer';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { getOpenRouterModels, formatWithOpenRouter, type OpenRouterModel } from '@/ai/flows/openrouter-format-flow';

const years = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018"];

const baseQuestionSchema = z.object({
  board: z.string().min(1, 'Board is required'),
  year: z.coerce.number().min(2000, 'Year is required'),
  class: z.string().min(1, 'Class is required'),
  subject: z.string().min(1, 'Subject is required'),
  chapter: z.string().min(1, 'Chapter is required'),
  text: z.string().min(1, 'Question text is required'),
  explanation: z.string().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

const mcqSchema = baseQuestionSchema.extend({
  type: z.literal('mcq'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).length(4, 'There must be 4 options'),
  correctAnswerIndex: z.coerce.number().min(0).max(3),
  guidebookAnswer: z.string().optional(),
});

const cqSchema = baseQuestionSchema.extend({
  type: z.literal('cq'),
  guidebookAnswers: z.array(z.string().min(1, "Answer can't be empty")).optional(),
});

const singleQuestionSchema = z.discriminatedUnion('type', [mcqSchema, cqSchema]);

const formSchema = z.object({
  questions: z.array(singleQuestionSchema).min(1, 'You must add at least one question.'),
});
type FormValues = z.infer<typeof formSchema>;

/**
 * Reusable AI Formatting UI component for form fields
 */
function AiFormattingControls({ 
    onFormat, 
    isLoading, 
    selectedModel, 
    onModelChange, 
    models,
    variant = "sm"
}: { 
    onFormat: () => void; 
    isLoading: boolean; 
    selectedModel: string; 
    onModelChange: (val: string) => void; 
    models: OpenRouterModel[];
    variant?: "sm" | "batch";
}) {
    if (variant === "batch") {
        return (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Batch AI Tool</span>
                </div>
                <Select value={selectedModel} onValueChange={onModelChange}>
                    <SelectTrigger className="w-[200px] h-9 bg-background">
                        <SelectValue placeholder="Select AI Model" />
                    </SelectTrigger>
                    <SelectContent>
                        {models.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button 
                    type="button" 
                    variant="default" 
                    size="sm" 
                    className="h-9 gap-2 shadow-sm"
                    onClick={onFormat}
                    disabled={isLoading || !selectedModel}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Format Entire Question & Answers
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="AI Model" />
                </SelectTrigger>
                <SelectContent>
                    {models.length > 0 ? (
                        models.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))
                    ) : (
                        <SelectItem value="loading" disabled>Loading models...</SelectItem>
                    )}
                </SelectContent>
            </Select>
            <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 gap-2 border-primary/50 hover:border-primary"
                onClick={onFormat}
                disabled={isLoading || !selectedModel}
            >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
                Auto LaTeX
            </Button>
        </div>
    );
}

function GuidebookAnswerFields({ 
    questionIndex, 
    control, 
    form,
    openRouterModels,
    selectedAiModel,
    setSelectedAiModel
}: any) {
    const { toast } = useToast();
    const [formattingIndex, setFormattingIndex] = useState<number | null>(null);
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${questionIndex}.guidebookAnswers`,
    });

    const handleAutoFormat = async (index: number) => {
        const fieldName = `questions.${questionIndex}.guidebookAnswers.${index}`;
        const currentText = form.getValues(fieldName);
        
        if (!currentText || !currentText.trim()) {
            toast({ variant: 'destructive', title: 'Empty Text', description: 'Please enter some text first.' });
            return;
        }
        if (!selectedAiModel) {
            toast({ variant: 'destructive', title: 'No Model Selected', description: 'Please select an AI model.' });
            return;
        }

        setFormattingIndex(index);
        try {
            const result = await formatWithOpenRouter({
                text: currentText,
                modelId: selectedAiModel,
            });
            form.setValue(fieldName, result.formattedText);
            toast({ title: 'Success', description: `Part ${String.fromCharCode(0x0995 + index)} formatted.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Formatting Error', description: error.message || 'AI formatting failed.' });
        } finally {
            setFormattingIndex(null);
        }
    };

    return (
        <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
                 <div>
                    <h3 className="font-semibold text-lg">Guide Book Answers</h3>
                    <p className="text-sm text-muted-foreground">Add a separate answer for each part of the creative question (e.g., ক, খ, গ).</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append("")}
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Answer Part
                </Button>
            </div>
            {fields.map((field, index) => (
                <div key={field.id} className="relative rounded-lg border bg-muted/50 p-4 space-y-2">
                    <FormField
                        control={control}
                        name={`questions.${questionIndex}.guidebookAnswers.${index}`}
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between mb-2">
                                    <FormLabel>Answer for Part {String.fromCharCode(0x0995 + index)}</FormLabel>
                                    <AiFormattingControls 
                                        onFormat={() => handleAutoFormat(index)}
                                        isLoading={formattingIndex === index}
                                        selectedModel={selectedAiModel}
                                        onModelChange={setSelectedAiModel}
                                        models={openRouterModels}
                                    />
                                </div>
                                <Tabs defaultValue="write" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="write">Write</TabsTrigger>
                                        <TabsTrigger value="preview">Preview</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="write">
                                        <FormControl>
                                            <Textarea placeholder={`Enter answer for part ${String.fromCharCode(0x0995 + index)}. Use LaTeX for math.`} rows={3} {...field} />
                                        </FormControl>
                                    </TabsContent>
                                    <TabsContent value="preview" className="rounded-md border bg-muted p-4 min-h-[100px]">
                                        <MathRenderer content={field.value || "Nothing to preview..."} />
                                    </TabsContent>
                                </Tabs>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {fields.length > 1 && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-3 -right-3 h-7 w-7"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ))}
        </div>
    );
}

function QuestionFormCard({ 
    field, 
    index, 
    form, 
    remove, 
    subjects, 
    classes, 
    boards, 
    fieldsLength, 
    isEditMode,
    openRouterModels,
    selectedAiModel,
    setSelectedAiModel
}: any) {
    const { toast } = useToast();
    const [formattingField, setFormattingField] = useState<string | null>(null);
    const [isBatchFormatting, setIsBatchFormatting] = useState(false);
    
    const questionType = useWatch({ control: form.control, name: `questions.${index}.type`, defaultValue: field.type || "cq" });
    const currentSelectedClass = useWatch({ control: form.control, name: `questions.${index}.class` });
    const currentSelectedSubjectName = useWatch({ control: form.control, name: `questions.${index}.subject` });

    const filteredSubjects = useMemo(() => {
        if (!subjects || !currentSelectedClass) return [];
        return subjects.filter((s: any) => s.class === currentSelectedClass);
    }, [subjects, currentSelectedClass]);
    
    const chapters = useMemo(() => {
        if (!filteredSubjects || !currentSelectedSubjectName) return [];
        const subject = filteredSubjects.find((s: any) => s.subjectName === currentSelectedSubjectName);
        return subject?.chapters || [];
    }, [filteredSubjects, currentSelectedSubjectName]);

    const handleAutoFormat = async (fieldName: string) => {
        const fullFieldName = `questions.${index}.${fieldName}`;
        const currentText = form.getValues(fullFieldName);
        
        if (!currentText || !currentText.trim()) {
            toast({ variant: 'destructive', title: 'Empty Text', description: 'Please enter some text first.' });
            return;
        }
        if (!selectedAiModel) {
            toast({ variant: 'destructive', title: 'No Model Selected', description: 'Please select an AI model.' });
            return;
        }

        setFormattingField(fieldName);
        try {
            const result = await formatWithOpenRouter({
                text: currentText,
                modelId: selectedAiModel,
            });
            form.setValue(fullFieldName, result.formattedText);
            toast({ title: 'Success', description: 'Content formatted with AI.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Formatting Error', description: error.message || 'AI formatting failed.' });
        } finally {
            setFormattingField(null);
        }
    };

    const handleBatchFormat = async () => {
        if (!selectedAiModel) {
            toast({ variant: 'destructive', title: 'No Model Selected', description: 'Please select an AI model.' });
            return;
        }

        setIsBatchFormatting(true);
        try {
            const fieldsToProcess: { path: string; label: string }[] = [];
            
            const textValue = form.getValues(`questions.${index}.text`);
            if (textValue && textValue.trim()) fieldsToProcess.push({ path: `questions.${index}.text`, label: 'Question Text' });
            
            const explanationValue = form.getValues(`questions.${index}.explanation`);
            if (explanationValue && explanationValue.trim()) fieldsToProcess.push({ path: `questions.${index}.explanation`, label: 'Explanation' });
            
            if (questionType === 'mcq') {
                const ga = form.getValues(`questions.${index}.guidebookAnswer`);
                if (ga && ga.trim()) fieldsToProcess.push({ path: `questions.${index}.guidebookAnswer`, label: 'Guide Answer' });
            } else if (questionType === 'cq') {
                const gas = form.getValues(`questions.${index}.guidebookAnswers`) || [];
                gas.forEach((val: string, i: number) => {
                    if (val && val.trim()) fieldsToProcess.push({ path: `questions.${index}.guidebookAnswers.${i}`, label: `Guide Answer Part ${String.fromCharCode(0x0995 + i)}` });
                });
            }

            if (fieldsToProcess.length === 0) {
                toast({ variant: 'destructive', title: 'No Content', description: 'Fill in some text fields before formatting.' });
                setIsBatchFormatting(false);
                return;
            }

            // Execute sequentially with a delay between requests to avoid rate limits
            for (let i = 0; i < fieldsToProcess.length; i++) {
                const item = fieldsToProcess[i];
                const rawText = form.getValues(item.path as any);
                
                // Add a 2s delay between requests to be extra safe with timeouts
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                try {
                    const result = await formatWithOpenRouter({ text: rawText, modelId: selectedAiModel });
                    form.setValue(item.path as any, result.formattedText, { shouldDirty: true, shouldValidate: true });
                } catch (err: any) {
                    console.error(`Error formatting field ${item.label}:`, err);
                    // Don't stop the whole loop if one field fails, but notify the user
                    toast({ 
                        variant: 'destructive', 
                        title: `Field Error: ${item.label}`, 
                        description: 'This field failed to format, but the process will continue.' 
                    });
                }
            }
            
            toast({ title: 'Batch Complete', description: 'Processing finished. Please review the results.' });
        } catch (error: any) {
            console.error("Batch formatting error:", error);
            toast({ variant: 'destructive', title: 'Batch Error', description: error.message || 'Batch AI formatting failed.' });
        } finally {
            setIsBatchFormatting(false);
        }
    };
    
    return (
    <Card key={field.id} className="relative border-2 border-dashed p-4 pt-12">
        {fieldsLength > 1 && !isEditMode && (
            <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => remove(index)}
            >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove Question</span>
            </Button>
        )}
        
        <div className="mb-6">
            <AiFormattingControls 
                variant="batch"
                onFormat={handleBatchFormat}
                isLoading={isBatchFormatting}
                selectedModel={selectedAiModel}
                onModelChange={setSelectedAiModel}
                models={openRouterModels}
            />
        </div>

        <div className="space-y-8">
            <FormField
                control={form.control}
                name={`questions.${index}.type`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditMode}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="mcq">Multiple Choice Question (MCQ)</SelectItem>
                        <SelectItem value="cq">Creative Question (CQ)</SelectItem>
                    </SelectContent>
                    </Select>
                    {isEditMode && <FormDescription>Question type cannot be changed when editing.</FormDescription>}
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="space-y-6 rounded-lg border p-4">
                <h3 className="font-semibold text-lg">Question Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name={`questions.${index}.class`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Class</FormLabel>
                            <Select onValueChange={(value) => { field.onChange(value); form.setValue(`questions.${index}.subject`, ''); form.setValue(`questions.${index}.chapter`, ''); }} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                                <SelectContent>{classes?.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`questions.${index}.subject`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select onValueChange={(value) => { field.onChange(value); form.setValue(`questions.${index}.chapter`, ''); }} value={field.value} disabled={!currentSelectedClass || filteredSubjects.length === 0}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                            <SelectContent>{filteredSubjects.map((s: any) => <SelectItem key={s.id} value={s.subjectName}>{s.subjectName}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`questions.${index}.chapter`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chapter</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!currentSelectedSubjectName || chapters.length === 0}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a chapter" /></SelectTrigger></FormControl>
                            <SelectContent>{chapters.map((c: any, i: number) => <SelectItem key={i} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`questions.${index}.board`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Board</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a board" /></SelectTrigger></FormControl>
                            <SelectContent>{boards?.map((b: any) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`questions.${index}.year`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Year</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a year" /></SelectTrigger></FormControl>
                            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            <FormField
                control={form.control}
                name={`questions.${index}.text`}
                render={({ field }) => (
                    <FormItem>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <FormLabel className="text-base">Question Text</FormLabel>
                            <AiFormattingControls 
                                onFormat={() => handleAutoFormat('text')}
                                isLoading={formattingField === 'text'}
                                selectedModel={selectedAiModel}
                                onModelChange={setSelectedAiModel}
                                models={openRouterModels}
                            />
                        </div>
                        <Tabs defaultValue="write" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="write">Write</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                            <TabsContent value="write">
                                <FormControl>
                                    <Textarea placeholder="Enter your question here. Use LaTeX for math: $...$ for inline, $$...$$ for block." rows={5} {...field} />
                                </FormControl>
                            </TabsContent>
                            <TabsContent value="preview" className="rounded-md border bg-muted p-4 min-h-[140px]">
                                 <MathRenderer content={field.value || "Nothing to preview..."} />
                            </TabsContent>
                        </Tabs>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            {questionType === 'cq' && (
                <GuidebookAnswerFields
                    questionIndex={index}
                    control={form.control}
                    form={form}
                    openRouterModels={openRouterModels}
                    selectedAiModel={selectedAiModel}
                    setSelectedAiModel={setSelectedAiModel}
                />
            )}

            {questionType === 'mcq' && (
                <FormField
                    control={form.control}
                    name={`questions.${index}.guidebookAnswer`}
                    render={({ field }) => (
                    <FormItem>
                        <div className="flex items-center justify-between mb-2">
                            <FormLabel>Guide Book Answer</FormLabel>
                            <AiFormattingControls 
                                onFormat={() => handleAutoFormat('guidebookAnswer')}
                                isLoading={formattingField === 'guidebookAnswer'}
                                selectedModel={selectedAiModel}
                                onModelChange={setSelectedAiModel}
                                models={openRouterModels}
                            />
                        </div>
                        <Tabs defaultValue="write" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="write">Write</TabsTrigger>
                                <TabsTrigger value="preview">Preview</TabsTrigger>
                            </TabsList>
                            <TabsContent value="write">
                                <FormControl>
                                    <Textarea placeholder="Enter the concise 'guide book' style answer here. Use LaTeX for math." rows={3} {...field} value={field.value ?? ''} />
                                </FormControl>
                            </TabsContent>
                            <TabsContent value="preview" className="rounded-md border bg-muted p-4 min-h-[100px]">
                                <MathRenderer content={field.value || "Nothing to preview..."} />
                            </TabsContent>
                        </Tabs>
                        <p className="text-sm text-muted-foreground">A short, direct answer or rationale.</p>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <FormField
                control={form.control}
                name={`questions.${index}.explanation`}
                render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between mb-2">
                        <FormLabel>Detailed Explanation (Include all parts: ক, খ, গ, ঘ)</FormLabel>
                        <AiFormattingControls 
                            onFormat={() => handleAutoFormat('explanation')}
                            isLoading={formattingField === 'explanation'}
                            selectedModel={selectedAiModel}
                            onModelChange={setSelectedAiModel}
                            models={openRouterModels}
                        />
                    </div>
                    <Tabs defaultValue="write" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="write">Write</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="write">
                            <FormControl>
                                <Textarea placeholder="Provide a detailed, step-by-step explanation. Use LaTeX for math." rows={5} {...field} />
                            </FormControl>
                        </TabsContent>
                        <TabsContent value="preview" className="rounded-md border bg-muted p-4 min-h-[140px]">
                            <MathRenderer content={field.value || "Nothing to preview..."} />
                        </TabsContent>
                    </Tabs>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name={`questions.${index}.videoUrl`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Video Explanation URL</FormLabel>
                    <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>Optional: A link to a video explanation on YouTube, etc.</FormDescription>
                    <FormMessage />
                </FormItem>
                )}
            />

            {questionType === 'mcq' && (
                <div className="space-y-6 border border-dashed p-4 rounded-lg">
                <h3 className="font-semibold text-lg">MCQ Options</h3>
                {[0, 1, 2, 3].map((optionIndex) => (
                    <FormField
                        key={optionIndex}
                        control={form.control}
                        name={`questions.${index}.options.${optionIndex}`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Option {String.fromCharCode(0x0995 + optionIndex)}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ))}
                <FormField
                    control={form.control}
                    name={`questions.${index}.correctAnswerIndex`}
                    render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Correct Answer</FormLabel>
                        <FormControl>
                        <RadioGroup onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)} className="flex flex-col space-y-1">
                            {[0, 1, 2, 3].map((radioIndex) => (
                            <FormItem key={radioIndex} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value={String(radioIndex)} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Option {String.fromCharCode(0x0995 + radioIndex)}
                                </FormLabel>
                            </FormItem>
                            ))}
                        </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            )}
        </div>
    </Card>);
}


function AddNewContentForm() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([]);
  const [selectedAiModel, setSelectedAiModel] = useState<string>('');
  // Key to force full form remount when edit data loads (prevents Select cascade bugs)
  const [formKey, setFormKey] = useState(0);

  const editingId = searchParams.get('id');
  const editingType = searchParams.get('type');
  const isEditMode = !!(editingId && editingType);

  const boardsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'boards') : null, [firestore]);
  const { data: boards } = useCollection(boardsQuery);
  const subjectsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'subjects') : null, [firestore]);
  const { data: subjects } = useCollection<Omit<Subject, 'id'>>(subjectsQuery);
  const classesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'classes') : null, [firestore]);
  const { data: classes } = useCollection(classesQuery);
  
  const editCollectionName = useMemo(() => editingType === 'mcq' ? 'mcqs' : 'boardQuestions', [editingType]);
  const questionDocRef = useMemoFirebase(() => {
    if (!firestore || !editingId) return null;
    return doc(firestore, editCollectionName, editingId);
  }, [firestore, editingId, editCollectionName]);

  const { data: editingQuestionData, isLoading: isLoadingQuestion } = useDoc(questionDocRef);

  useEffect(() => {
    getOpenRouterModels().then(models => {
        setOpenRouterModels(models);
        const defaultModel = models.find(m => m.id.includes('gpt-4') || m.id.includes('claude-3-sonnet') || m.id.includes('gemini-pro-1.5'));
        if (defaultModel) setSelectedAiModel(defaultModel.id);
        else if (models.length > 0) setSelectedAiModel(models[0].id);
    });
  }, []);

  const defaultQuestion = {
    type: 'cq' as const,
    board: '',
    year: new Date().getFullYear(),
    class: '',
    subject: '',
    chapter: '',
    text: '',
    guidebookAnswer: '',
    guidebookAnswers: [''],
    explanation: '',
    videoUrl: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
  };

  // Build initial values — when editing, use loaded data; otherwise default
  const [initialValues, setInitialValues] = useState<FormValues>({ questions: [defaultQuestion] });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  useEffect(() => {
    if (isEditMode && editingQuestionData) {
        const raw: any = { ...editingQuestionData };
        // Remove Firestore metadata fields
        delete raw.id;
        delete raw.createdAt;
        delete raw.updatedAt;

        const payload: any = {
            ...raw,
            type: editingType as 'cq' | 'mcq',
        };

        // Ensure MCQ options are always an array of 4
        if (payload.type === 'mcq') {
            payload.options = payload.options || ['', '', '', ''];
            while (payload.options.length < 4) payload.options.push('');
            payload.correctAnswerIndex = payload.correctAnswerIndex ?? 0;
            payload.guidebookAnswer = payload.guidebookAnswer || '';
        }

        // Data migration for old CQs with a single guidebookAnswer
        if (payload.type === 'cq') {
            if (typeof payload.guidebookAnswer === 'string' && !payload.guidebookAnswers) {
                payload.guidebookAnswers = payload.guidebookAnswer ? [payload.guidebookAnswer] : [''];
            }
            if (!payload.guidebookAnswers || payload.guidebookAnswers.length === 0) {
                payload.guidebookAnswers = [''];
            }
            delete payload.guidebookAnswer;
        }

        payload.videoUrl = payload.videoUrl || '';
        payload.explanation = payload.explanation || '';
        payload.year = Number(payload.year) || new Date().getFullYear();

        const newValues = { questions: [payload] };
        setInitialValues(newValues);
        // Increment formKey to force a full remount with new defaultValues
        setFormKey(prev => prev + 1);
        // Also call form.reset directly for immediate effect
        form.reset(newValues);
    }
  }, [isEditMode, editingQuestionData, editingType]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
        return;
    }

    if(isEditMode) {
        if(!editingId) return;

        const question = values.questions[0];
        let targetCollection: string;
        let dataToSave: any;

        if (question.type === 'mcq') {
            targetCollection = 'mcqs';
            const { type, ...mcqData } = mcqSchema.parse(question);
            dataToSave = { ...mcqData, updatedAt: serverTimestamp() };
        } else {
            targetCollection = 'boardQuestions';
            const { type, ...cqData } = cqSchema.parse(question);
            dataToSave = { ...cqData, updatedAt: serverTimestamp() };
        }

        const docRef = doc(firestore, targetCollection, editingId);
        updateDoc(docRef, dataToSave)
            .then(() => {
                toast({ title: 'Success', description: 'Question updated successfully.' });
            })
            .catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: dataToSave,
                }));
                 toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update question. Check permissions.' });
            });
    } else {
        try {
            const promises = values.questions.map((question) => {
                let collectionName: string;
                let dataToSave: any;

                if (question.type === 'mcq') {
                    collectionName = 'mcqs';
                    const parsed = mcqSchema.parse(question);
                    const { type, ...mcqData } = parsed;
                    dataToSave = { ...mcqData, createdAt: serverTimestamp() };
                } else {
                    collectionName = 'boardQuestions';
                    const parsed = cqSchema.parse(question);
                    const { type, ...cqData } = parsed;
                    dataToSave = { ...cqData, createdAt: serverTimestamp() };
                }
                
                const collRef = collection(firestore, collectionName);
                return addDoc(collRef, dataToSave).catch((e) => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({ path: collRef.path, operation: 'create', requestResourceData: dataToSave }));
                    throw e; // throw error to be caught by Promise.all
                });
            });

            await Promise.all(promises);
            
            toast({ title: 'Success', description: `${values.questions.length} question(s) added successfully.` });
            form.reset({ questions: [defaultQuestion] }); // Reset with one empty question
        } catch (error) {
            console.error("Error saving questions:", error);
            toast({ variant: 'destructive', title: 'Submission Error', description: 'One or more questions failed to save. Please check your permissions and try again.' });
        }
    }
  };

  if (isEditMode && isLoadingQuestion) {
      return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Question' : 'Add New Questions'}</CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'Modify the details of the question below.'
              : 'Fill out the forms to add multiple CQs or MCQs to the database in a single batch.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {fields.map((field, index) => (
                    <QuestionFormCard
                        key={`${formKey}-${field.id}`}
                        field={field}
                        index={index}
                        form={form}
                        remove={remove}
                        subjects={subjects}
                        classes={classes}
                        boards={boards}
                        fieldsLength={fields.length}
                        isEditMode={isEditMode}
                        openRouterModels={openRouterModels}
                        selectedAiModel={selectedAiModel}
                        setSelectedAiModel={setSelectedAiModel}
                    />
                ))}
                
                <div className="flex items-center justify-between pt-4">
                    {!isEditMode && (
                      <Button
                          type="button"
                          variant="outline"
                          onClick={() => append(defaultQuestion)}
                      >
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Another Question
                      </Button>
                    )}
                    <Button type="submit" disabled={form.formState.isSubmitting} className={isEditMode ? 'w-full' : ''}>
                        {form.formState.isSubmitting 
                            ? (isEditMode ? "Saving..." : "Saving All...") 
                            : (isEditMode ? 'Update Question' : 'Save All Questions')
                        }
                    </Button>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {!isEditMode && <Card className="mt-8">
        <CardHeader>
            <CardTitle>Advanced Tools</CardTitle>
            <p className="text-sm text-muted-foreground">Use these tools for more advanced content creation.</p>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Bulk Upload MCQs</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Quickly add hundreds of MCQs by uploading an Excel or CSV file.
                    The file must have columns in the following order: `class`, `subject`, `chapter`, `board`, `year`, `text`, `option1`, `option2`, `option3`, `option4`, `correctAnswerIndex`, `explanationTitle`, `explanationStep1Title`, `explanationStep1Content`, `guidebookAnswer`. More explanation steps can be added.
                </p>
                <div className="flex items-center gap-2">
                    <Input type="file" className="max-w-xs" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                    <Button type="button" variant="secondary" disabled>Upload File</Button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sigma className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">LaTeX Support for Math Equations</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    For complex mathematical and scientific formulas, you can use LaTeX syntax directly in any text field (like Question Text, Options, or Explanations). Wrap your formulas in `$` for inline math (e.g., `$E=mc^2$`) or `$$` for block math.
                </p>
            </div>
        </CardContent>
      </Card>}
    </>
  );
}

export default function AddNewContentPage() {
    return (
        <AddNewContentForm />
    )
}
