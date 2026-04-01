'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { StickyNote, Plus, Pin, PinOff, Trash2, Search, FolderIcon } from 'lucide-react';

interface Note { id: string; title: string; isPinned: boolean; folderId?: string | null; updatedAt: string }
interface NoteFolder { id: string; name: string; _count?: { notes: number } }

export default function NotesPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();

  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<object>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ['note-folders', orgId],
    queryFn: () => api.notes.folders.list().then((r) => r.data as NoteFolder[]),
    enabled: !!orgId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', orgId, selectedFolder, searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        const r = await api.notes.search(searchQuery);
        return r.data as Note[];
      }
      const r = await api.notes.list(selectedFolder);
      return r.data as Note[];
    },
    enabled: !!orgId,
  });

  const { data: noteDetail } = useQuery({
    queryKey: ['note', orgId, selectedNote],
    queryFn: () => api.notes.get(selectedNote!).then((r) => r.data),
    enabled: !!orgId && !!selectedNote,
  });

  const createMutation = useMutation({
    mutationFn: () => api.notes.create({ title: 'Untitled Note', content: {}, folderId: selectedFolder }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['notes', orgId] });
      setSelectedNote(res.data.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => api.notes.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', orgId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.notes.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes', orgId] });
      setSelectedNote(null);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) => api.notes.update(id, { isPinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', orgId] }),
  });

  useEffect(() => {
    if (noteDetail) {
      setTitle(noteDetail.title);
      setContent(noteDetail.content as object);
    }
  }, [noteDetail]);

  const triggerAutoSave = (newTitle: string, newContent: object) => {
    if (!selectedNote) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ id: selectedNote, data: { title: newTitle, content: newContent } });
    }, 800);
  };

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => api.notes.folders.create({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note-folders', orgId] }),
  });

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Left sidebar */}
      <div className="w-64 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-slate-900 mb-3">Notes</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search notes..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Folders */}
        <div className="p-2 border-b">
          <button
            className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm', !selectedFolder ? 'bg-primary text-white' : 'hover:bg-slate-100')}
            onClick={() => setSelectedFolder(undefined)}
          >
            <StickyNote className="w-4 h-4" />All Notes
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm', selectedFolder === f.id ? 'bg-primary text-white' : 'hover:bg-slate-100')}
              onClick={() => setSelectedFolder(f.id)}
            >
              <FolderIcon className="w-4 h-4" />{f.name}
              <span className="ml-auto text-xs opacity-60">{f._count?.notes || 0}</span>
            </button>
          ))}
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-slate-500 hover:bg-slate-100"
            onClick={() => {
              const name = prompt('Folder name:');
              if (name) createFolderMutation.mutate(name);
            }}
          >
            <Plus className="w-4 h-4" />New Folder
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Notes</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => createMutation.mutate()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          {notes.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No notes yet</p>
          )}
          {notes.map((note) => (
            <button
              key={note.id}
              className={cn('w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors', selectedNote === note.id ? 'bg-primary text-white' : 'hover:bg-slate-100')}
              onClick={() => setSelectedNote(note.id)}
            >
              <div className="flex items-center gap-1">
                {note.isPinned && <Pin className="w-3 h-3 flex-shrink-0" />}
                <p className="text-sm font-medium truncate">{note.title}</p>
              </div>
              <p className={cn('text-xs mt-0.5', selectedNote === note.id ? 'text-white/70' : 'text-slate-400')}>
                {formatDate(note.updatedAt)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor pane */}
      {selectedNote && noteDetail ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-3 border-b bg-white">
            <Input
              value={title}
              onChange={(e) => { setTitle(e.target.value); triggerAutoSave(e.target.value, content); }}
              className="border-none text-xl font-bold shadow-none focus-visible:ring-0 p-0 h-auto"
              placeholder="Note title"
            />
            <div className="flex gap-1 ml-auto">
              <Button
                variant="ghost" size="sm"
                onClick={() => togglePinMutation.mutate({ id: selectedNote, isPinned: !noteDetail.isPinned })}
                title={noteDetail.isPinned ? 'Unpin' : 'Pin'}
              >
                {noteDetail.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate(selectedNote)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <TipTapEditor
            content={content}
            onChange={(newContent) => { setContent(newContent); triggerAutoSave(title, newContent); }}
            className="flex-1 overflow-y-auto"
            toolbar={true}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <StickyNote className="w-16 h-16 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Select a note or create a new one</p>
            <Button className="mt-4" onClick={() => createMutation.mutate()}>New Note</Button>
          </div>
        </div>
      )}
    </div>
  );
}
