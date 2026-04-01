'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Grid3X3, Presentation, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  { value: 'PAGES', label: 'Pages', description: 'Rich text documents', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50', href: '/documents/pages' },
  { value: 'NUMBERS', label: 'Numbers', description: 'Spreadsheets', icon: Grid3X3, color: 'text-green-500', bg: 'bg-green-50', href: '/documents/numbers' },
  { value: 'KEYNOTE', label: 'Keynote', description: 'Presentations', icon: Presentation, color: 'text-yellow-500', bg: 'bg-yellow-50', href: '/documents/keynote' },
];

interface TpDocument {
  id: string; title: string; type: 'PAGES' | 'NUMBERS' | 'KEYNOTE';
  createdAt: string; updatedAt: string;
}

export default function DocumentsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const router = useRouter();
  const [activeType, setActiveType] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['docs', orgId, activeType],
    queryFn: () => api.docs.list(activeType || undefined).then((r) => r.data as TpDocument[]),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: (type: string) => api.docs.create(type),
    onSuccess: (res) => {
      const doc = res.data;
      const typeInfo = DOC_TYPES.find((t) => t.value === doc.type);
      if (typeInfo) router.push(`${typeInfo.href}/${doc.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.docs.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs', orgId] }),
  });

  const getDocTypeInfo = (type: string) => DOC_TYPES.find((t) => t.value === type) || DOC_TYPES[0];

  const handleOpen = (doc: TpDocument) => {
    const typeInfo = getDocTypeInfo(doc.type);
    router.push(`${typeInfo.href}/${doc.id}`);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500 mt-1">Pages, Numbers & Keynote</p>
        </div>
        <div className="flex gap-2">
          {DOC_TYPES.map((t) => (
            <Button key={t.value} variant="outline" onClick={() => createMutation.mutate(t.value)}>
              <t.icon className={cn('w-4 h-4 mr-2', t.color)} />{t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-colors', !activeType ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
          onClick={() => setActiveType(null)}
        >All</button>
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors', activeType === t.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            onClick={() => setActiveType(t.value)}
          >
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center gap-4 mb-6">
            {DOC_TYPES.map((t) => (
              <div key={t.value} className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', t.bg)}>
                <t.icon className={cn('w-8 h-8', t.color)} />
              </div>
            ))}
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No documents yet</h3>
          <p className="text-slate-500 mb-6">Create your first Pages, Numbers, or Keynote document</p>
          <div className="flex justify-center gap-3">
            {DOC_TYPES.map((t) => (
              <Button key={t.value} variant="outline" onClick={() => createMutation.mutate(t.value)}>
                <Plus className="w-4 h-4 mr-2" />New {t.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map((doc) => {
            const typeInfo = getDocTypeInfo(doc.type);
            return (
              <Card key={doc.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleOpen(doc)}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', typeInfo.bg)}>
                      <typeInfo.icon className={cn('w-5 h-5', typeInfo.color)} />
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 truncate">{doc.title}</h3>
                  <Badge variant="secondary" className="text-xs">{typeInfo.label}</Badge>
                  <p className="text-xs text-slate-400 mt-2">Edited {formatDate(doc.updatedAt)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
