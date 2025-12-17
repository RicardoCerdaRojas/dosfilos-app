import { useEffect } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: 'edit' | 'live' | 'preview';
  enablePreview?: boolean;
  className?: string;
}

/**
 * Reusable Markdown Editor Component
 * Wraps @uiw/react-md-editor with app-specific configuration
 * 
 * Features:
 * - Live preview toggle
 * - Keyboard shortcuts (Cmd+B for bold, etc.)
 * - Theme matching
 * - Toolbar customization
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  height = 400,
  preview = 'live',
  enablePreview = true,
  className = ''
}: MarkdownEditorProps) {
  
  // Apply dark mode based on app theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.setAttribute('data-color-mode', isDark ?'dark' : 'light');
  }, []);

  // Custom toolbar commands
  const customCommands = [
    commands.bold,
    commands.italic,
    commands.divider,
    commands.title1,
    commands.title2,
    commands.title3,
    commands.divider,
    commands.quote,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.divider,
    commands.link,
    commands.divider,
    commands.codeBlock,
    commands.divider,
    commands.help,
  ];

  return (
    <div className={`markdown-editor-wrapper ${className}`} data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        preview={preview}
        height={height}
        textareaProps={{
          placeholder
        }}
        commands={customCommands}
        extraCommands={enablePreview ? [
          commands.codeEdit,
          commands.codeLive,
          commands.codePreview,
          commands.fullscreen
        ] : [commands.fullscreen]}
        visibleDragbar={false}
        highlightEnable={true}
        enableScroll={true}
      />
    </div>
  );
}

/**
 * Markdown Editor in read-only preview mode
 * Used for displaying markdown without editing
 */
export function MarkdownPreview({ 
  value, 
  className = '' 
}: { 
  value: string; 
  className?: string 
}) {
  return (
    <div className={`markdown-preview ${className}`} data-color-mode="light">
      <MDEditor.Markdown 
        source={value} 
        style={{ whiteSpace: 'pre-wrap'}}
      />
    </div>
  );
}
