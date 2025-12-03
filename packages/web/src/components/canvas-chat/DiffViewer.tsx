import { useMemo } from 'react';
import { Card } from '@/components/ui/card';

/**
 * Props for DiffViewer component
 */
interface DiffViewerProps {
  oldContent: any;
  newContent: any;
  contentType: 'text' | 'array' | 'object';
}

/**
 * Represents a diff line
 */
interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

/**
 * DiffViewer Component
 * Shows visual differences between two versions of content
 */
export function DiffViewer({ oldContent, newContent, contentType }: DiffViewerProps) {
  const diff = useMemo(() => {
    return computeDiff(oldContent, newContent, contentType);
  }, [oldContent, newContent, contentType]);

  if (contentType === 'text') {
    return (
      <div className="space-y-1 font-mono text-sm">
        {diff.map((line, index) => (
          <div
            key={index}
            className={`px-3 py-1 ${
              line.type === 'added'
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : line.type === 'removed'
                ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                : 'bg-muted/30 text-muted-foreground'
            }`}
          >
            <span className="select-none mr-2 opacity-50">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            {line.content || ' '}
          </div>
        ))}
      </div>
    );
  }

  if (contentType === 'array') {
    return (
      <div className="space-y-2">
        {diff.map((line, index) => (
          <Card
            key={index}
            className={`p-3 ${
              line.type === 'added'
                ? 'border-green-500/50 bg-green-500/5'
                : line.type === 'removed'
                ? 'border-red-500/50 bg-red-500/5'
                : 'border-muted'
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`flex-shrink-0 font-bold ${
                  line.type === 'added'
                    ? 'text-green-600 dark:text-green-400'
                    : line.type === 'removed'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'
                }`}
              >
                {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
              </span>
              <div className="flex-1 text-sm">
                {typeof line.content === 'object' ? (
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(line.content, null, 2)}
                  </pre>
                ) : (
                  line.content
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (contentType === 'object') {
    return (
      <div className="space-y-1 font-mono text-sm">
        {diff.map((line, index) => (
          <div
            key={index}
            className={`px-3 py-1 ${
              line.type === 'added'
                ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                : line.type === 'removed'
                ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                : 'bg-muted/30 text-muted-foreground'
            }`}
          >
            <span className="select-none mr-2 opacity-50">
              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
            </span>
            {line.content}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

/**
 * Compute diff between two contents
 */
function computeDiff(oldContent: any, newContent: any, contentType: string): DiffLine[] {
  if (contentType === 'text') {
    return computeTextDiff(
      String(oldContent || ''),
      String(newContent || '')
    );
  }

  if (contentType === 'array') {
    return computeArrayDiff(
      Array.isArray(oldContent) ? oldContent : [],
      Array.isArray(newContent) ? newContent : []
    );
  }

  if (contentType === 'object') {
    return computeObjectDiff(oldContent || {}, newContent || {});
  }

  return [];
}

/**
 * Compute diff for text content (line by line)
 */
function computeTextDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: DiffLine[] = [];

  // Simple line-by-line comparison
  const maxLength = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      // Unchanged line
      if (oldLine !== undefined) {
        diff.push({ type: 'unchanged', content: oldLine });
      }
    } else {
      // Lines differ
      if (oldLine !== undefined) {
        diff.push({ type: 'removed', content: oldLine });
      }
      if (newLine !== undefined) {
        diff.push({ type: 'added', content: newLine });
      }
    }
  }

  return diff;
}

/**
 * Compute diff for array content
 */
function computeArrayDiff(oldArray: any[], newArray: any[]): DiffLine[] {
  const diff: DiffLine[] = [];
  const oldSet = new Set(oldArray.map(item => JSON.stringify(item)));
  const newSet = new Set(newArray.map(item => JSON.stringify(item)));

  // Items removed
  oldArray.forEach(item => {
    const itemStr = JSON.stringify(item);
    if (!newSet.has(itemStr)) {
      diff.push({ type: 'removed', content: item });
    }
  });

  // Items added or unchanged
  newArray.forEach(item => {
    const itemStr = JSON.stringify(item);
    if (oldSet.has(itemStr)) {
      diff.push({ type: 'unchanged', content: item });
    } else {
      diff.push({ type: 'added', content: item });
    }
  });

  return diff;
}

/**
 * Compute diff for object content (JSON format)
 */
function computeObjectDiff(oldObj: any, newObj: any): DiffLine[] {
  const oldStr = JSON.stringify(oldObj, null, 2);
  const newStr = JSON.stringify(newObj, null, 2);
  return computeTextDiff(oldStr, newStr);
}
