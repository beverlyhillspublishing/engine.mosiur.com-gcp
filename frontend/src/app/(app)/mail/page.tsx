'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import {
  Inbox, Star, Archive, Trash2, Search, Pencil, Settings,
  ChevronRight, Mail, RefreshCw, Loader2,
} from 'lucide-react';

interface MailAccount { id: string; label: string; email: string; provider: string; syncStatus: string }
interface Thread {
  id: string; subject?: string; snippet?: string; isRead: boolean; isStarred: boolean;
  lastMessageAt: string; participantEmails: string[]; messageCount: number;
  _count?: { messages: number };
}
interface Message {
  id: string; fromEmail: string; fromName?: string; subject?: string;
  bodyHtml?: string; bodyText?: string; sentAt: string;
}

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'archived', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export default function MailPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const router = useRouter();

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['mail-accounts', orgId],
    queryFn: () => api.mail.accounts.list().then((r) => r.data as MailAccount[]),
    enabled: !!orgId,
    onSuccess: (data: MailAccount[]) => {
      if (data.length > 0 && !selectedAccount) setSelectedAccount(data[0].id);
    },
  });

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ['mail-threads', orgId, selectedAccount, selectedFolder, searchQuery],
    queryFn: async () => {
      if (!selectedAccount) return { threads: [], total: 0 };
      if (searchQuery) {
        const r = await api.mail.search(searchQuery, selectedAccount);
        return { threads: r.data as Thread[], total: (r.data as Thread[]).length };
      }
      const r = await api.mail.threads.list(selectedAccount, { folder: selectedFolder });
      return r.data;
    },
    enabled: !!orgId && !!selectedAccount,
  });

  const threads = (threadsData?.threads || []) as Thread[];

  const { data: threadDetail } = useQuery({
    queryKey: ['mail-thread', orgId, selectedThread],
    queryFn: () => api.mail.threads.get(selectedThread!).then((r) => r.data),
    enabled: !!orgId && !!selectedThread,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-threads', orgId] }),
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => api.mail.accounts.sync(accountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-threads', orgId] }),
  });

  const starMutation = useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) =>
      api.mail.threads.update(id, { isStarred }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-threads', orgId] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.mail.threads.update(id, { isArchived: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mail-threads', orgId] }),
  });

  const currentAccount = accounts.find((a) => a.id === selectedAccount);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Left pane: accounts + folders */}
      <div className="w-56 border-r bg-slate-50 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Mail</h2>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => router.push('/mail/compose')}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Folders */}
        <div className="p-2">
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors', selectedFolder === f.id ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-700')}
              onClick={() => { setSelectedFolder(f.id); setSelectedThread(null); }}
            >
              <f.icon className="w-4 h-4" />{f.label}
            </button>
          ))}
        </div>

        <div className="border-t mt-2" />

        {/* Accounts */}
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Accounts</div>
          {accounts.map((account) => (
            <button
              key={account.id}
              className={cn('w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors', selectedAccount === account.id ? 'bg-slate-200 font-medium' : 'hover:bg-slate-100')}
              onClick={() => { setSelectedAccount(account.id); setSelectedThread(null); }}
            >
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
                {account.email[0].toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="truncate text-xs font-medium">{account.label}</p>
                <p className="truncate text-xs text-slate-400">{account.email}</p>
              </div>
            </button>
          ))}
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-500 mt-1" onClick={() => router.push('/mail/settings')}>
            <Settings className="w-3.5 h-3.5 mr-2" />Manage accounts
          </Button>
        </div>
      </div>

      {/* Center pane: thread list */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search mail..."
                className="pl-8 h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {selectedAccount && (
              <Button
                variant="ghost" size="sm" className="h-8 w-8 p-0"
                onClick={() => syncMutation.mutate(selectedAccount)}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={cn('w-4 h-4', syncMutation.isPending && 'animate-spin')} />
              </Button>
            )}
          </div>
          <div className="text-xs text-slate-500">{currentAccount?.label} — {selectedFolder}</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selectedAccount ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              Add a mail account to get started
            </div>
          ) : threadsLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : threads.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No messages</div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                className={cn(
                  'w-full text-left px-4 py-3 border-b hover:bg-slate-50 transition-colors',
                  selectedThread === thread.id && 'bg-blue-50',
                  !thread.isRead && 'bg-white',
                )}
                onClick={() => setSelectedThread(thread.id)}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className={cn('text-sm truncate flex-1', !thread.isRead ? 'font-semibold' : 'font-medium text-slate-700')}>
                    {thread.participantEmails[0] || '(no sender)'}
                  </p>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(thread.lastMessageAt)}</span>
                </div>
                <p className={cn('text-sm truncate mt-0.5', !thread.isRead ? 'text-slate-900' : 'text-slate-600')}>
                  {thread.subject || '(no subject)'}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{thread.snippet}</p>
                <div className="flex items-center gap-1 mt-1">
                  {thread.messageCount > 1 && <Badge variant="secondary" className="text-xs h-4 px-1">{thread.messageCount}</Badge>}
                  {thread.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right pane: thread detail */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {selectedThread && threadDetail ? (
          <>
            <div className="px-6 py-4 border-b bg-white flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{(threadDetail as { subject?: string }).subject || '(no subject)'}</h2>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => starMutation.mutate({ id: selectedThread, isStarred: !(threadDetail as { isStarred: boolean }).isStarred })}>
                  <Star className={cn('w-4 h-4', (threadDetail as { isStarred: boolean }).isStarred && 'fill-yellow-400 text-yellow-400')} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => archiveMutation.mutate(selectedThread)}>
                  <Archive className="w-4 h-4" />
                </Button>
                <Button onClick={() => router.push(`/mail/compose?replyTo=${selectedThread}`)}>
                  Reply
                </Button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {((threadDetail as { messages?: Message[] }).messages || []).map((msg) => (
                <div key={msg.id} className="bg-white rounded-xl border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{msg.fromName || msg.fromEmail}</p>
                      <p className="text-sm text-slate-500">{msg.fromEmail}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(msg.sentAt)}</span>
                  </div>
                  <div className="border-t pt-3">
                    {msg.bodyHtml ? (
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} />
                    ) : (
                      <pre className="text-sm whitespace-pre-wrap text-slate-700">{msg.bodyText}</pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <Mail className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Select a message to read</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
