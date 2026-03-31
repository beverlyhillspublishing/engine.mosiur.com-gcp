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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Trash2, CheckCircle } from 'lucide-react';

type Provider = 'SMTP' | 'SENDGRID' | 'SES' | 'MAILGUN';

export default function SendersPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('SMTP');
  const [form, setForm] = useState({ name: '', fromEmail: '', fromName: '', host: '', port: '587', user: '', pass: '', apiKey: '', domain: '', region: '', accessKeyId: '', secretAccessKey: '' });
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const { data: senders, isLoading } = useQuery({
    queryKey: ['senders', orgId],
    queryFn: () => api.senders.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const config = provider === 'SMTP'
        ? { host: form.host, port: parseInt(form.port), user: form.user, pass: form.pass }
        : provider === 'SENDGRID' ? { apiKey: form.apiKey }
        : provider === 'SES' ? { region: form.region, accessKeyId: form.accessKeyId, secretAccessKey: form.secretAccessKey }
        : { apiKey: form.apiKey, domain: form.domain };
      return api.senders.create({ name: form.name, provider, fromEmail: form.fromEmail, fromName: form.fromName, config });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['senders', orgId] }); setOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.senders.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['senders', orgId] }),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.senders.verify(id).then((r) => r.data),
    onSuccess: (data) => setVerifyResult(data.message || 'Success'),
    onError: () => setVerifyResult('Verification failed'),
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Senders</h1>
          <p className="text-slate-500 mt-1">Configure your email delivery providers</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Sender</Button>
      </div>

      {isLoading ? <div className="text-center py-12 text-slate-500">Loading...</div> : (
        <div className="space-y-3">
          {(senders as {id: string; name: string; provider: string; fromEmail: string; fromName: string; isDefault: boolean}[])?.map((sender) => (
            <Card key={sender.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">{sender.name}</h3>
                      <Badge variant="secondary">{sender.provider}</Badge>
                      {sender.isDefault && <Badge variant="success">Default</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{sender.fromName} &lt;{sender.fromEmail}&gt;</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => verifyMutation.mutate(sender.id)} disabled={verifyMutation.isPending}>
                    <CheckCircle className="w-4 h-4 mr-1" />Test
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate(sender.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!(senders as {id: string}[])?.length && (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500">No senders configured. Add your first email provider.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {verifyResult && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm" onClick={() => setVerifyResult(null)}>
          {verifyResult}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Email Sender</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input placeholder="Production SendGrid" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>From Name</Label>
                <Input placeholder="Acme Corp" value={form.fromName} onChange={(e) => setForm(f => ({ ...f, fromName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>From Email</Label>
                <Input type="email" placeholder="hello@acme.com" value={form.fromEmail} onChange={(e) => setForm(f => ({ ...f, fromEmail: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMTP">SMTP</SelectItem>
                  <SelectItem value="SENDGRID">SendGrid</SelectItem>
                  <SelectItem value="SES">AWS SES</SelectItem>
                  <SelectItem value="MAILGUN">Mailgun</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {provider === 'SMTP' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Host</Label><Input placeholder="smtp.gmail.com" value={form.host} onChange={(e) => setForm(f => ({ ...f, host: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Port</Label><Input value={form.port} onChange={(e) => setForm(f => ({ ...f, port: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Username</Label><Input value={form.user} onChange={(e) => setForm(f => ({ ...f, user: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.pass} onChange={(e) => setForm(f => ({ ...f, pass: e.target.value }))} /></div>
                </div>
              </div>
            )}
            {(provider === 'SENDGRID' || provider === 'MAILGUN') && (
              <div className="space-y-1"><Label>API Key</Label><Input type="password" value={form.apiKey} onChange={(e) => setForm(f => ({ ...f, apiKey: e.target.value }))} /></div>
            )}
            {provider === 'MAILGUN' && (
              <div className="space-y-1"><Label>Domain</Label><Input placeholder="mg.acme.com" value={form.domain} onChange={(e) => setForm(f => ({ ...f, domain: e.target.value }))} /></div>
            )}
            {provider === 'SES' && (
              <div className="space-y-3">
                <div className="space-y-1"><Label>Region</Label><Input placeholder="us-east-1" value={form.region} onChange={(e) => setForm(f => ({ ...f, region: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Access Key ID</Label><Input value={form.accessKeyId} onChange={(e) => setForm(f => ({ ...f, accessKeyId: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Secret Access Key</Label><Input type="password" value={form.secretAccessKey} onChange={(e) => setForm(f => ({ ...f, secretAccessKey: e.target.value }))} /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add Sender'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
