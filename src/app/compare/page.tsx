'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Files, Upload, GitCompare, Loader2 } from 'lucide-react';
import { getTemplateFileNames } from '@/lib/actions';
import { compareFiles } from '@/lib/compare-actions';


const CompareSchema = z.object({
  userFile: z
    .any()
    .refine((files) => files?.length === 1, 'Please upload one file.'),
  templateFile: z.string({ required_error: 'Please select a template.' }),
});

type CompareFormValues = z.infer<typeof CompareSchema>;

export default function ComparePage() {
  const [isComparing, setIsComparing] = React.useState(false);
  const [differences, setDifferences] = React.useState<string[]>([]);
  const [templates, setTemplates] = React.useState<{value: string, label: string}[]>([]);
  const { toast } = useToast();

  const form = useForm<CompareFormValues>({
    resolver: zodResolver(CompareSchema),
  });
  
  React.useEffect(() => {
    async function fetchTemplates() {
      const templateNames = await getTemplateFileNames();
      const formattedTemplates = templateNames.map(name => ({
        value: name,
        label: name.replace('.JSON', ''),
      }));
      setTemplates(formattedTemplates);
    }
    fetchTemplates();
  }, []);

  const fileRef = form.register("userFile");

  async function onSubmit(data: CompareFormValues) {
    setIsComparing(true);
    setDifferences([]);

    const file = data.userFile[0];
    if (!file) {
      toast({ title: 'Error', description: 'No file selected.', variant: 'destructive' });
      setIsComparing(false);
      return;
    }

    const fileContent = await file.text();

    try {
      const result = await compareFiles(fileContent, data.templateFile);
      setDifferences(result);
      if (result.length === 0) {
        toast({ title: 'No Differences Found', description: 'The two files are identical.' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        title: 'Error Comparing Files',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <main className="w-full max-w-2xl">
        <Card className="w-full shadow-2xl">
          <CardHeader>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary shadow-md">
                <Files className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-grow">
                <CardTitle className="text-3xl font-headline">
                  Compare JSON
                </CardTitle>
                <CardDescription className="mt-1">
                  Upload a JSON file and select a template to compare.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="userFile"
                    render={() => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><Upload className="size-4" />Your JSON File</FormLabel>
                        <FormControl>
                          <Input type="file" accept=".json" {...fileRef} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="templateFile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2"><GitCompare className="size-4" />Template to Compare</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a template..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" disabled={isComparing}>
                    {isComparing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Comparing...
                      </>
                    ) : (
                      <>
                        <GitCompare className="mr-2 h-4 w-4" />
                        Compare Files
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {differences.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Differences Found:</h3>
                <Card className="max-h-96 overflow-y-auto bg-muted/50 p-4">
                  <pre className="text-sm text-foreground whitespace-pre-wrap">
                    {differences.join('\n')}
                  </pre>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Ateme Titan Configurator. All rights reserved.</p>
      </footer>
    </div>
  );
}
