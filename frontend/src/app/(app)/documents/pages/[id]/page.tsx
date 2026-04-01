'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function PagesEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<object>({});
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: doc } = useQuery({
    queryKey: ['doc', orgId, id],
    queryFn: () => api.docs.get(id).then((r) => r.data),
    enabled: !!orgId && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => api.docs.update(id, data),
    onSuccess: () => setSaved(true),
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content as object);
    }
  }, [doc]);

  const triggerSave = (newTitle: string, newContent: object) => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateMutation.mutate({ title: newTitle, content: newContent });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white">
        <Button variant="ghost" size="sm" onClick={() => router.push('/documents')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); triggerSave(e.target.value, content); }}
          className="border-none shadow-none focus-visible:ring-0 font-semibold text-lg"
          placeholder="Untitled"
        />
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <span className="flex items-center gap-1"><Save className="w-3.5 h-3.5" />Saved</span>
          ) : null}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto py-12 px-8">
          {doc && (
            <TipTapEditor
              content={content}
              onChange={(newContent) => { setContent(newContent); triggerSave(title, newContent); }}
              toolbar={true}
              className="min-h-[60vh]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
