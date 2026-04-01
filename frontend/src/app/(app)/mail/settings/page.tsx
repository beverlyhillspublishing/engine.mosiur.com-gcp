'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const PROVIDERS = [
  { value: 'gmail', label: 'Gmail', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 587 },
  { value: 'outlook', label: 'Outlook / Hotmail', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  { value: 'icloud', label: 'iCloud', imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  { value: 'yahoo', label: 'Yahoo', imapHost: 'imap.mail.yahoo.com', imapPort: 993, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 587 },
  { value: 'other', label: 'Other', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 587 },
];

interface MailAccount { id: string; label: string; email: string; provider: string; syncStatus: string; syncError?: string; lastSyncAt?: string }

export default function MailSettingsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState('gmail');
  const [form, setForm] = useState({ label: '', email: '', username: '', password: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 587 });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['mail-accounts', orgId],
    queryFn: () => api.mail.accounts.list().then((r) => r.data as MailAccount[]),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.mail.accounts.create({ ...form, provider }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mail-accounts', orgId] });
      setOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.mail.accounts.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-accounts', orgId] }),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api.mail.accounts.sync(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-accounts', orgId] }),
  });

  const resetForm = () => {
    setForm({ label: '', email: '', username: '', password: '', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 587 });
    setProvider('gmail');
  };

  const handleProviderChange = (val: string) => {
    setProvider(val);
    const p = PROVIDERS.find((p) => p.value === val);
    if (p) {
      setForm((prev) => ({ ...prev, imapHost: p.imapHost, imapPort: p.imapPort, smtpHost: p.smtpHost, smtpPort: p.smtpPort }));
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.push('/mail')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Mail</Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Mail Accounts</h1>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Account</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-slate-500 mb-4">No mail accounts added yet</p>
            <Button onClick={() => setOpen(true)}>Add your first account</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {account.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{account.label}</p>
                      <p className="text-sm text-slate-500">{account.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs capitalize">{account.provider}</Badge>
                        {account.syncStatus === 'idle' && account.lastSyncAt && (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />Synced
                          </span>
                        )}
                        {account.syncStatus === 'syncing' && (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />Syncing...
                          </span>
                        )}
                        {account.syncStatus === 'error' && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />{account.syncError}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => syncMutation.mutate(account.id)} disabled={syncMutation.isPending}>
                      <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate(account.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Mail Account</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Label</Label>
                <Input placeholder="Work Gmail" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email address</Label>
                <Input type="email" placeholder="you@gmail.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Username</Label>
                <Input placeholder="Usually your email" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Password / App Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            {provider === 'other' && (
              <>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="space-y-1">
                    <Label>IMAP Host</Label>
                    <Input placeholder="imap.example.com" value={form.imapHost} onChange={(e) => setForm((f) => ({ ...f, imapHost: e.target.value }))} />
                  </div>
                  <div className="space-y-1 w-20">
                    <Label>Port</Label>
                    <Input type="number" value={form.imapPort} onChange={(e) => setForm((f) => ({ ...f, imapPort: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <div className="space-y-1">
                    <Label>SMTP Host</Label>
                    <Input placeholder="smtp.example.com" value={form.smtpHost} onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))} />
                  </div>
                  <div className="space-y-1 w-20">
                    <Label>Port</Label>
                    <Input type="number" value={form.smtpPort} onChange={(e) => setForm((f) => ({ ...f, smtpPort: Number(e.target.value) }))} />
                  </div>
                </div>
              </>
            )}
            {provider === 'gmail' && (
              <p className="text-xs text-slate-500 bg-amber-50 p-2 rounded">
                Gmail requires an App Password. Enable 2-FA, then create an App Password at myaccount.google.com/apppasswords
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.label || !form.email || !form.password || createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
