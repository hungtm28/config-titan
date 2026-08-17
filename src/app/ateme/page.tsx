'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define the type for your template data
type TemplateData = {
  [key: string]: any;
};

export default function AtemeConfigurator() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch the list of templates on component mount
  useEffect(() => {
    fetch('/templates/index.json')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates)); // Correctly access the templates array
  }, []);

  // Fetch the data for the selected template
  useEffect(() => {
    if (selectedTemplate) {
      setIsLoading(true);
      fetch(`/templates/${selectedTemplate}`)
        .then((res) => res.json())
        .then((data) => {
          setTemplateData(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [selectedTemplate]);

  // Handle changes to the form data
  const handleDataChange = (path: string, value: any) => {
    if (templateData) {
      const newTemplateData = { ...templateData };
      let current: any = newTemplateData;
      const keys = path.split('.');
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      setTemplateData(newTemplateData);
    }
  };

  // Render the form recursively
  const renderForm = (data: TemplateData, path = '') => {
    return Object.entries(data).map(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return (
          <Card key={currentPath} className="mt-4">
            <CardHeader>
              <CardTitle className="capitalize">{key.replace(/_/g, ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
                {renderForm(value, currentPath)}
            </CardContent>
          </Card>
        );
      } else if (typeof value !== 'object') {
        return (
          <div key={currentPath} className="grid grid-cols-2 gap-4 items-center mt-2">
            <Label htmlFor={currentPath} className="text-right capitalize">{key.replace(/_/g, ' ')}</Label>
            <Input
              id={currentPath}
              type="text"
              value={value}
              onChange={(e) => handleDataChange(currentPath, e.target.value)}
              className="col-span-1"
            />
          </div>
        );
      }
      return null;
    });
  };

  // Export the current data as a JSON file
  const exportJson = () => {
    if (templateData) {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(templateData, null, 2)
      )}`;
      const link = document.createElement('a');
      link.href = jsonString;
      link.download = selectedTemplate || 'custom-template.json';
      link.click();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ateme Titan Live Configurator</h1>
      </header>

      <Card>
        <CardHeader>
            <CardTitle>Template Selection</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4 items-center">
                <Label htmlFor="template-select">Select a template:</Label>
                <Select onValueChange={setSelectedTemplate} value={selectedTemplate}>
                    <SelectTrigger id="template-select">
                        <SelectValue placeholder="--Please choose a template--" />
                    </SelectTrigger>
                    <SelectContent>
                        {templates.map((template) => (
                        <SelectItem key={template} value={template}>
                            {template}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      {isLoading && <p className="text-center mt-4">Loading template...</p>}

      {templateData && !isLoading && (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Editing: {selectedTemplate}</h2>
                <Button onClick={exportJson}>Export JSON</Button>
            </div>
          <div>{renderForm(templateData)}</div>
        </div>
      )}
    </div>
  );
}
