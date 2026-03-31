'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { Code, Plus, Trash2, Copy, Check } from 'lucide-react';

export default function ApiKeysPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys', orgId],
    queryFn: () => api.apiKeys.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.apiKeys.create(name).then((r) => r.data),
    onSuccess: (data) => { setCreatedKey(data.key); qc.invalidateQueries({ queryKey: ['api-keys', orgId] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.apiKeys.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', orgId] }),
  });

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">API Keys</h1>
          <p className="text-slate-500 mt-1">Use API keys to integrate with external services</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Create API Key</Button>
      </div>

      {createdKey && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">API key created — copy it now!</h4>
          <p className="text-xs text-green-700 mb-3">This key will not be shown again.</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-white border border-green-200 rounded px-3 py-2 text-sm font-mono overflow-hidden text-ellipsis">{createdKey}</code>
            <Button variant="outline" size="sm" onClick={copyKey}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(apiKeys as {id: string; name: string; prefix: string; lastUsedAt?: string; createdAt: string}[])?.map((key) => (
          <Card key={key.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Code className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{key.name}</p>
                  <p className="text-sm text-slate-500 font-mono">{key.prefix}••••••••••••••••</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created {formatDate(key.createdAt)}
                    {key.lastUsedAt && ` · Last used ${formatDate(key.lastUsedAt)}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(key.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {!(apiKeys as {id: string}[])?.length && (
          <Card><CardContent className="text-center py-12 text-slate-500">No API keys created yet.</CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setName(''); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Key name</Label>
              <Input placeholder="e.g. Zapier Integration" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { createMutation.mutate(); setOpen(false); }} disabled={!name || createMutation.isPending}>
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
