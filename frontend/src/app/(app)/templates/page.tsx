'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { MailIcon, Plus, Trash2, Copy, Globe, Sparkles } from 'lucide-react';
import { AiBuilderDialog } from '@/components/ai-builder/AiBuilderDialog';

export default function TemplatesPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [name, setName] = useState('');
  const [html, setHtml] = useState('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', orgId],
    queryFn: () => api.templates.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.templates.create({ name, htmlContent: html, category: 'Custom' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates', orgId] }); setOpen(false); setName(''); setHtml(''); },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.templates.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates', orgId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.templates.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates', orgId] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-500 mt-1">Reusable email designs for your campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}><Sparkles className="w-4 h-4 mr-2" />AI Build</Button>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Template</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : !(templates as {id: string}[])?.length ? (
        <Card>
          <CardContent className="text-center py-16">
            <MailIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No templates yet</h3>
            <p className="text-slate-500 mb-6">Create reusable templates to speed up campaign creation.</p>
            <Button size="lg" onClick={() => setOpen(true)}>Create Template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(templates as {id: string; name: string; category?: string; isGlobal: boolean; updatedAt: string}[])?.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <MailIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex gap-1">
                    {template.isGlobal && <Globe className="w-4 h-4 text-slate-400 mt-1" title="Global template" />}
                    <Button variant="ghost" size="sm" onClick={() => duplicateMutation.mutate(template.id)} title="Duplicate">
                      <Copy className="w-4 h-4" />
                    </Button>
                    {!template.isGlobal && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900">{template.name}</h3>
                {template.category && <Badge variant="secondary" className="mt-1 text-xs">{template.category}</Badge>}
                <p className="text-xs text-slate-400 mt-3">Updated {formatDate(template.updatedAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AiBuilderDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onAccept={(generatedHtml) => { setHtml(generatedHtml); setOpen(true); }}
        orgId={orgId}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Template name</Label>
              <Input placeholder="e.g. Monthly Newsletter" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>HTML Content</Label>
              <textarea
                className="w-full h-48 border border-input rounded-md p-3 text-sm font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="<html><body><h1>Hello {{firstName}}!</h1></body></html>"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
