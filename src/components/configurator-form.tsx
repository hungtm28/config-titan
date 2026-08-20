"use client";

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileJson,
  MapPin,
  Network,
  Image as ImageIcon,
  Move,
  Download,
  Loader2,
  ShieldQuestion,
} from 'lucide-react';

import { ConfiguratorSchema, type ConfiguratorValues } from '@/lib/definitions';
import { generateJson, getTemplateFileNames } from '@/lib/actions';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';

const sites = [
  { value: 'HN', label: 'HN' },
  { value: 'HCM', label: 'HCM' },
];

const ipTypes = [
    { value: 'DRM', label: 'DRM' },
    { value: 'NonDRM', label: 'Không DRM' },
]

// Based on the user's image
const ipOutputsNonDRM = [
  '17', '18', '48', '49', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '203', '204'
].map((ip) => ({ value: ip, label: ip }));

// The rest of the IPs
const ipOutputsDRM = [
  '27', '28', '30', '31', '32', '33', '34', '35', '37', '38', 
  '100', '101', '5', '6', '73', '76', '77',
].map((ip) => ({ value: ip, label: ip }));


const logos = [
  { value: 'Fplay_TT_EPL.png', label: 'Fplay_TT_EPL.png' },
  { value: 'Fplay_TTDQ.png', label: 'Fplay_TTDQ.png' },
  { value: 'Fplay_TT.png', label: 'Fplay_TT.png' },
];

const logoPositions = [
  { value: 'top-right', label: 'Trên Phải (Top Right)' },
  { value: 'bottom-right', label: 'Dưới Phải (Bottom Right)' },
  { value: 'top-left', label: 'Trên Trái (Top Left)' },
  { value: 'bottom-left', label: 'Dưới Trái (Bottom Left)' },
  { value: 'epl', label: 'EPL' },
];

export function ConfiguratorForm() {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [templates, setTemplates] = React.useState<{value: string, label: string}[]>([]);
  const [currentIpList, setCurrentIpList] = React.useState<{value: string, label: string}[]>([]);
  const { toast } = useToast();

  const form = useForm<ConfiguratorValues>({
    resolver: zodResolver(ConfiguratorSchema),
    defaultValues: {
        template: '',
        site: '',
        ipType: '',
        ipOutput: '',
        logo: '',
        logoPosition: ''
    },
  });

  const ipType = useWatch({ control: form.control, name: 'ipType' });

  React.useEffect(() => {
    if (ipType === 'DRM') {
      setCurrentIpList(ipOutputsDRM);
    } else if (ipType === 'NonDRM') {
      setCurrentIpList(ipOutputsNonDRM);
    } else {
      setCurrentIpList([]);
    }
    form.resetField('ipOutput');
  }, [ipType, form]);

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

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGenerating && progress < 90) {
      timer = setTimeout(() => {
        setProgress((prev) => Math.min(prev + Math.random() * 20, 90));
      }, 300);
    }
    return () => clearTimeout(timer);
  }, [isGenerating, progress]);

  async function onSubmit(data: ConfiguratorValues) {
    setIsGenerating(true);
    setProgress(10);

    try {
      const jsonString = await generateJson(data);
      setProgress(100);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const templateNameWithoutExt = data.template.replace(/\.JSON/i, '');
      const eplPrefix = data.template.toUpperCase().startsWith('EPL_') ? 'EPL_' : '';
      const downloadName = `${eplPrefix}${data.site}_${templateNameWithoutExt}_${data.ipOutput}`;

      a.download = `${downloadName}.json`;
      document.body.appendChild(a);
a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success!',
        description: 'Your JSON file has been generated and downloaded.',
        variant: 'default',
        className: 'bg-accent text-accent-foreground border-green-300'
      });

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating File',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setTimeout(() => setProgress(0), 500);
      }, 500);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="template"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><FileJson />Template</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
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

          <FormField
            control={form.control}
            name="site"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><MapPin />Site</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a site..." /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
                control={form.control}
                name="ipType"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2"><ShieldQuestion />Loại IP</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Chọn loại IP..." /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {ipTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
            control={form.control}
            name="ipOutput"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="flex items-center gap-2"><Network />IP Output (x)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!ipType}>
                    <FormControl>
                    <SelectTrigger><SelectValue placeholder={!ipType ? "Vui lòng chọn Loại IP trước" : "Chọn một giá trị IP..."} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {currentIpList.map((ip) => (
                        <SelectItem key={ip.value} value={ip.value}>{ip.label}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><ImageIcon />Logo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a logo..." /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {logos.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoPosition"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2"><Move />Logo Position</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select a position..." /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {logoPositions.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {isGenerating && (
          <div className="space-y-2 pt-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">Generating your file...</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate & Download
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
