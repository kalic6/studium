import React, { useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Highlighter,
  Quote,
  Eraser,
} from 'lucide-react';

interface RichNoteEditorProps {
  value: string;
  onChange: (newHtml: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  maxLength?: number;
}

/**
 * Converts legacy plain-text/Markdown strings to HTML if they don't already contain HTML tags.
 */
function normalizeToHtml(raw: string): string {
  if (!raw) return '';
  if (/<(p|div|ul|ol|li|h2|h3|b|strong|i|em|u|mark|blockquote|span|br)\b/i.test(raw)) {
    return raw;
  }

  // Convert simple markdown lines to HTML
  const lines = raw.split('\n');
  const htmlLines = lines.map((line) => {
    const formattedInline = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    if (formattedInline.startsWith('### ')) {
      return `<h3>${formattedInline.slice(4)}</h3>`;
    }
    if (formattedInline.startsWith('## ')) {
      return `<h2>${formattedInline.slice(3)}</h2>`;
    }
    if (formattedInline.startsWith('- ')) {
      return `<ul><li>${formattedInline.slice(2)}</li></ul>`;
    }
    return formattedInline ? `<p>${formattedInline}</p>` : '<p><br></p>';
  });

  return htmlLines.join('').replace(/<\/ul><ul>/g, '');
}

export const RichNoteEditor: React.FC<RichNoteEditorProps> = ({
  value,
  onChange,
  placeholder = 'Pište poznámky... (můžete použít tučné písmo, kurzívu, zvýraznění i odrážky)',
  minHeightClass = 'min-h-[220px]',
  maxLength = 20000,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastNormalizedRef = useRef<string>('');

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const normalized = normalizeToHtml(value);
    if (el.innerHTML !== normalized && value !== lastNormalizedRef.current) {
      el.innerHTML = normalized;
      lastNormalizedRef.current = value;
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML.slice(0, maxLength);
    lastNormalizedRef.current = html;
    onChange(html);
  };

  const execFormat = (command: string, commandValue?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  return (
    <div className="border border-slate-300 rounded-md bg-white overflow-hidden focus-within:border-[#003865]">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 text-slate-700">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('bold');
          }}
          title="Tučné (Ctrl+B)"
          className="p-1.5 rounded hover:bg-white hover:text-slate-900 transition-colors"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('italic');
          }}
          title="Kurzíva (Ctrl+I)"
          className="p-1.5 rounded hover:bg-white hover:text-slate-900 transition-colors"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('underline');
          }}
          title="Podtržené (Ctrl+U)"
          className="p-1.5 rounded hover:bg-white hover:text-slate-900 transition-colors"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" aria-hidden="true" />

        {/* Highlight colors (Zvýraznění textu) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('hiliteColor', '#FEF08A');
          }}
          title="Žluté zvýraznění textu"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-200/80 text-slate-900 rounded hover:bg-yellow-300 transition-colors whitespace-nowrap"
        >
          <Highlighter className="w-3 h-3" />
          <span>Žlutě</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('hiliteColor', '#BBF7D0');
          }}
          title="Zelené zvýraznění textu"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-200/80 text-slate-900 rounded hover:bg-emerald-300 transition-colors whitespace-nowrap"
        >
          <span>Zeleně</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('hiliteColor', '#BAE6FD');
          }}
          title="Modré zvýraznění textu"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-sky-200/80 text-slate-900 rounded hover:bg-sky-300 transition-colors whitespace-nowrap"
        >
          <span>Modře</span>
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" aria-hidden="true" />

        {/* Headings & Lists */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('formatBlock', 'H2');
          }}
          title="Nadpis sekce"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-white hover:text-slate-900 transition-colors whitespace-nowrap"
        >
          <Heading2 className="w-3.5 h-3.5" />
          <span>Nadpis</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('insertUnorderedList');
          }}
          title="Odrážkový seznam"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-white hover:text-slate-900 transition-colors whitespace-nowrap"
        >
          <List className="w-3.5 h-3.5" />
          <span>Odrážky</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('insertOrderedList');
          }}
          title="Číslovaný seznam"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-white hover:text-slate-900 transition-colors whitespace-nowrap"
        >
          <ListOrdered className="w-3.5 h-3.5" />
          <span>Číslování</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('formatBlock', 'BLOCKQUOTE');
          }}
          title="Důležitá definice / citace"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-white hover:text-slate-900 transition-colors whitespace-nowrap"
        >
          <Quote className="w-3.5 h-3.5" />
          <span>Definice</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('removeFormat');
            execFormat('formatBlock', 'P');
          }}
          title="Vymazat formátování vybraného textu"
          className="p-1.5 rounded hover:bg-white hover:text-slate-900 transition-colors ml-auto"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Editable Rich Text Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={`rich-note-content ${minHeightClass} w-full px-3.5 py-3 text-sm leading-relaxed text-slate-900 focus:outline-none overflow-y-auto`}
      />
    </div>
  );
};
