'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2,
  List, ListOrdered, Quote, Minus, Undo, Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TipTapEditorProps {
  content?: object;
  onChange?: (content: object) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  toolbar?: boolean;
}

export function TipTapEditor({ content, onChange, placeholder = 'Start writing...', editable = true, className, toolbar = true }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  return (
    <div className={cn('flex flex-col', className)}>
      {toolbar && editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-slate-50 rounded-t-md">
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('strike') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('code') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-3.5 h-3.5" /></Button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('heading', { level: 1 }) && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('heading', { level: 2 }) && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-3.5 h-3.5" /></Button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('bulletList') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('orderedList') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0', editor.isActive('blockquote') && 'bg-slate-200')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-3.5 h-3.5" /></Button>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo className="w-3.5 h-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo className="w-3.5 h-3.5" /></Button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none flex-1 p-4 focus:outline-none',
          'prose-headings:font-bold prose-p:my-1 prose-li:my-0',
          toolbar && editable && 'border rounded-b-md',
          !toolbar && 'border rounded-md',
        )}
      />
    </div>
  );
}
