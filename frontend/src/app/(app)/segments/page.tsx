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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { GitBranch, Plus, Trash2, RefreshCw } from 'lucide-react';

const FIELDS = [
  { value: 'email', label: 'Email' },
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'status', label: 'Status' },
  { value: 'tags', label: 'Tags' },
];

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'is_set', label: 'is set' },
  { value: 'is_not_set', label: 'is not set' },
];

export default function SegmentsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [rules, setRules] = useState([{ field: 'email', operator: 'contains', value: '' }]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const { data: segments, isLoading } = useQuery({
    queryKey: ['segments', orgId],
    queryFn: () => api.segments.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.segments.create({
      name,
      filterRules: { operator: 'AND', rules: rules.map((r) => ({ ...r })) },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['segments', orgId] }); setOpen(false); setName(''); setRules([{ field: 'email', operator: 'contains', value: '' }]); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.segments.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['segments', orgId] }),
  });

  const updateRule = (idx: number, key: string, val: string) => {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Segments</h1>
          <p className="text-slate-500 mt-1">Dynamic audience filters that update automatically</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New Segment</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : !(segments as {id: string}[])?.length ? (
        <Card>
          <CardContent className="text-center py-16">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No segments yet</h3>
            <p className="text-slate-500 mb-6">Create dynamic segments to target the right contacts.</p>
            <Button size="lg" onClick={() => setOpen(true)}>Create Segment</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(segments as {id: string; name: string; description?: string; createdAt: string}[])?.map((segment) => (
            <Card key={segment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-indigo-600" />
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(segment.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-semibold text-slate-900">{segment.name}</h3>
                <p className="text-xs text-slate-400 mt-2">{formatDate(segment.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Segment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Segment name</Label>
              <Input placeholder="e.g. Active customers in US" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <Label className="mb-3 block">Filter rules (ALL conditions must match)</Label>
              <div className="space-y-3">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={rule.field} onValueChange={(v) => updateRule(idx, 'field', v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELDS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={(v) => updateRule(idx, 'operator', v)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {!['is_set', 'is_not_set'].includes(rule.operator) && (
                      <Input placeholder="Value" className="flex-1" value={rule.value} onChange={(e) => updateRule(idx, 'value', e.target.value)} />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setRules((prev) => prev.filter((_, i) => i !== idx))}>✕</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setRules((prev) => [...prev, { field: 'email', operator: 'contains', value: '' }])}>
                  <Plus className="w-3 h-3 mr-1" />Add Rule
                </Button>
              </div>
            </div>

            {previewCount !== null && (
              <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-sm font-medium">
                ~{previewCount} contacts match these rules
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
