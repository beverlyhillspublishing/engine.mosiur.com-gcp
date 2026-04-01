'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send } from 'lucide-react';

export default function ComposeMailPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accountId, setAccountId] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState<object>({});
  const [showCc, setShowCc] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ['mail-accounts', orgId],
    queryFn: () => api.mail.accounts.list().then((r) => r.data as { id: string; label: string; email: string }[]),
    enabled: !!orgId,
    onSuccess: (data: { id: string; label: string; email: string }[]) => {
      if (data.length > 0 && !accountId) setAccountId(data[0].id);
    },
  });

  // Convert TipTap JSON to basic HTML for sending
  function jsonToHtml(json: object): string {
    try {
      const doc = json as { content?: { type: string; content?: { type: string; text?: string }[] }[] };
      if (!doc.content) return '';
      return doc.content.map((block) => {
        const text = block.content?.map((n) => n.text || '').join('') || '';
        if (block.type === 'heading') return `<h2>${text}</h2>`;
        return `<p>${text}</p>`;
      }).join('');
    } catch {
      return '';
    }
  }

  const sendMutation = useMutation({
    mutationFn: () =>
      api.mail.compose({
        accountId,
        to: to.split(',').map((e) => e.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : undefined,
        subject,
        html: jsonToHtml(body),
        replyToThreadId: searchParams.get('replyTo') || undefined,
      }),
    onSuccess: () => router.push('/mail'),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <h1 className="text-2xl font-bold text-slate-900">Compose</h1>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-5 space-y-4 border-b">
          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <Label className="text-slate-500 w-16">From</Label>
            {accounts.length > 0 ? (
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label} &lt;{a.email}&gt;</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm text-slate-500">No accounts — <a href="/mail/settings" className="text-primary hover:underline">add one</a></span>
            )}
          </div>

          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <Label className="text-slate-500 w-16">To</Label>
            <div className="flex items-center gap-2">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com, ..."
                className="flex-1"
              />
              <button className="text-xs text-slate-400 hover:text-primary" onClick={() => setShowCc((v) => !v)}>Cc</button>
            </div>
          </div>

          {showCc && (
            <div className="grid grid-cols-[auto_1fr] items-center gap-3">
              <Label className="text-slate-500 w-16">Cc</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com, ..." />
            </div>
          )}

          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <Label className="text-slate-500 w-16">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          </div>
        </div>

        <div className="min-h-[300px]">
          <TipTapEditor
            content={body}
            onChange={setBody}
            placeholder="Write your message..."
            toolbar={true}
            className="min-h-[300px]"
          />
        </div>

        <div className="flex justify-end p-4 border-t bg-slate-50">
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!accountId || !to || !subject || sendMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
