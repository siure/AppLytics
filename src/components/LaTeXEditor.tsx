'use client';

import { useCallback } from 'react';
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
    backgroundColor: 'var(--background) !important',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    lineHeight: '1.6',
  },
  '.cm-content': {
    padding: '16px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  // Adjust selection color to match app theme
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--primary) !important',
    opacity: '0.3',
  },
  // Adjust cursor color
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--primary)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--background) !important',
    borderRight: '1px solid var(--border) !important',
    color: 'var(--muted-foreground) !important',
  },
  
});

export default function LaTeXEditor({
  value,
  onChange,
  placeholder = 'Enter LaTeX code...',
  className = '',
  readOnly = false,
}: LaTeXEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
    
  );

  return (
    <div className={`h-full overflow-hidden border-t border-border bg-muted/30 ${className}`}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        theme={oneDark}
        extensions={[latex(), cleanTheme]}
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
