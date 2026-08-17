'use server';

import { headers } from 'next/headers';
import { detailedDiff } from 'deep-object-diff';

// Helper to get base URL
async function getBaseUrl() {
  const heads = headers();
  const protocol = heads.get('x-forwarded-proto') || 'http';
  const host = heads.get('host');
  return `${protocol}://${host}`;
}

async function getTemplateContent(templateName: string): Promise<any> {
  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/templates/${templateName}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Template file not found: ${templateName}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching template content for ${templateName}:`, error);
    throw new Error(`Failed to load template: ${templateName}`);
  }
}

// Helper to access nested values by path string (e.g., 'a.0.b.c')
function getValueByPath(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => 
    (current && typeof current === 'object' && key in current) ? current[key] : undefined, 
  obj);
}

// Formatter for ADDED and DELETED sections
function formatSimpleDiff(diffObject: any, title: string): string[] {
    const results: string[] = [];

    function recurse(obj: any, path: string) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const newPath = path ? `${path}.${key}` : key;
            const value = obj[key];

            if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
                recurse(value, newPath);
            } else {
                results.push(`- ${newPath}: ${JSON.stringify(value)}`);
            }
        }
    }

    recurse(diffObject, '');

    if (results.length > 0) {
        return [title, ...results];
    }
    return [];
}

// Formatter for UPDATED section to show before and after
function formatUpdatedDiff(diffObject: any, templateObj: any, userObj: any): string[] {
    const results: string[] = [];

    function recurse(obj: any, path: string) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const newPath = path ? `${path}.${key}` : key;
            const value = obj[key];

            if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
                recurse(value, newPath);
            } else {
                const templateValue = getValueByPath(templateObj, newPath);
                const userValue = getValueByPath(userObj, newPath);

                results.push(`- ${newPath}:`);
                results.push(`    Template  : ${JSON.stringify(templateValue)}`);
                results.push(`    Your File : ${JSON.stringify(userValue)}`);
            }
        }
    }
    
    recurse(diffObject, '');

    if (results.length > 0) {
        return ['-- UPDATED --', ...results];
    }
    return [];
}

export async function compareFiles(userFileContent: string, templateFileName: string): Promise<string[]> {
  try {
    const templateContent = await getTemplateContent(templateFileName);
    const userJson = JSON.parse(userFileContent);

    const userObject = Array.isArray(userJson) ? userJson[0] : userJson;
    const templateObject = Array.isArray(templateContent) ? templateContent[0] : templateContent;
    
    if (!userObject || !templateObject) {
        throw new Error('Invalid JSON structure. Expected an array with one object.');
    }

    const { added, deleted, updated } = detailedDiff(templateObject, userObject) as any;

    const formattedDiffs: string[] = [
        ...formatSimpleDiff(added, '-- ADDED (in your file) --'),
        ...formatSimpleDiff(deleted, '-- DELETED (from template) --'),
        ...formatUpdatedDiff(updated, templateObject, userObject)
    ];

    return formattedDiffs;

  } catch (error) {
    console.error('Error in compareFiles:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to compare files.');
  }
}
