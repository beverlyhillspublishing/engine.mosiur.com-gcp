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
import { List, Plus, Trash2, Users } from 'lucide-react';

export default function ListsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: lists, isLoading } = useQuery({
    queryKey: ['lists', orgId],
    queryFn: () => api.lists.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.lists.create({ name, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lists', orgId] }); setOpen(false); setName(''); setDescription(''); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.lists.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lists', orgId] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Lists</h1>
          <p className="text-slate-500 mt-1">Organize your contacts into targeted lists</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />New List</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : !(lists as {id:string}[])?.length ? (
        <Card>
          <CardContent className="text-center py-16">
            <List className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No lists yet</h3>
            <p className="text-slate-500 mb-6">Create a list to organize your contacts and target campaigns.</p>
            <Button size="lg" onClick={() => setOpen(true)}>Create Your First List</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(lists as {id: string; name: string; description?: string; createdAt: string; _count: {contacts: number}}[])?.map((list) => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 -mt-1 -mr-2" onClick={() => deleteMutation.mutate(list.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="font-semibold text-slate-900">{list.name}</h3>
                {list.description && <p className="text-sm text-slate-500 mt-1">{list.description}</p>}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-slate-500">{list._count?.contacts || 0} contacts</span>
                  <span className="text-xs text-slate-400">{formatDate(list.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New List</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>List name</Label>
              <Input placeholder="e.g. Newsletter subscribers" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description <span className="text-slate-400">(optional)</span></Label>
              <Input placeholder="What is this list for?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create List'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
