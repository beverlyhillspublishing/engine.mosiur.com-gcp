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
import { Webhook, Plus, Trash2, TestTube, CheckCircle } from 'lucide-react';

const EVENTS = ['campaign.sent', 'contact.subscribed', 'contact.unsubscribed', 'contact.bounced', 'contact.complained'];

export default function WebhooksPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks', orgId],
    queryFn: () => api.webhooks.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.webhooks.create({ url, events: selectedEvents }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks', orgId] }); setOpen(false); setUrl(''); setSelectedEvents([]); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.webhooks.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks', orgId] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.webhooks.test(id),
  });

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-slate-500 mt-1">Receive real-time notifications for events</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Webhook</Button>
      </div>

      <div className="space-y-3">
        {(webhooks as {id: string; url: string; events: string[]; isActive: boolean}[])?.map((wh) => (
          <Card key={wh.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Webhook className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-slate-900 truncate">{wh.url}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {wh.events.map((e) => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Badge variant={wh.isActive ? 'success' : 'secondary'}>{wh.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Button variant="outline" size="sm" onClick={() => testMutation.mutate(wh.id)} disabled={testMutation.isPending}>
                    <TestTube className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate(wh.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!(webhooks as {id: string}[])?.length && (
          <Card><CardContent className="text-center py-12 text-slate-500">No webhooks configured yet.</CardContent></Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Endpoint URL</Label>
              <Input placeholder="https://your-app.com/webhooks" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Events to subscribe</Label>
              <div className="space-y-2">
                {EVENTS.map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={(e) => setSelectedEvents((prev) => e.target.checked ? [...prev, event] : prev.filter((ev) => ev !== event))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm font-mono text-slate-700">{event}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!url || selectedEvents.length === 0 || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Add Webhook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
