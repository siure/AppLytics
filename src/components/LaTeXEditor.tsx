'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import CodeMirror from '@uiw/react-codemirror';
import { latex } from 'codemirror-lang-latex';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

interface LaTeXEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

// Custom theme for the clean look
const cleanTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
    backgroundColor: 'transparent !important', // Allow container background to show through
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '16px',
    caretColor: 'var(--primary)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  // Adjust selection color to match app theme
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--primary) !important',
    opacity: '0.2',
  },
  // Adjust cursor color
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--primary)',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent !important',
    borderRight: '1px solid var(--border) !important',
    color: 'var(--muted-foreground) !important',
  },
  // Fix for light mode selected line number visibility
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--primary) !important',
  },
  // Active line background
  '.cm-activeLine': {
    backgroundColor: 'var(--muted)',
  },
});

export default function LaTeXEditor({
  value,
  onChange,
  placeholder = 'Enter LaTeX code...',
  className = '',
  readOnly = false,
}: LaTeXEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  // Determine extensions based on theme
  const extensions = [latex(), cleanTheme];
  if (mounted && resolvedTheme === 'dark') {
    extensions.push(oneDark);
  }

  return (
    <div className={`h-full overflow-hidden border-t border-border bg-muted/30 ${className}`}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        placeholder={placeholder}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightSelectionMatches: true,
          searchKeymap: true,
        }}
        style={{ height: '100%' }}
      />
    </div>
  );
}
