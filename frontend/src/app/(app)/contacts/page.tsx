'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Users, Search, Upload, Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  SUBSCRIBED: <CheckCircle className="w-4 h-4 text-green-500" />,
  UNSUBSCRIBED: <XCircle className="w-4 h-4 text-slate-400" />,
  BOUNCED: <AlertCircle className="w-4 h-4 text-red-500" />,
};

export default function ContactsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', orgId, search],
    queryFn: () => api.contacts.list({ search }).then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: stats } = useQuery({
    queryKey: ['contact-stats', orgId],
    queryFn: () => api.contacts.stats().then((r) => r.data),
    enabled: !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.contacts.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts', orgId] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-500">
            <span className="text-green-600 font-medium">{stats?.subscribed || 0} subscribed</span>
            <span>{stats?.unsubscribed || 0} unsubscribed</span>
            <span className="text-red-500">{stats?.bounced || 0} bounced</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="outline"><Upload className="w-4 h-4 mr-2" />Import CSV</Button>
          </Link>
          <Button><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading contacts...</div>
      ) : (data?.data || []).length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No contacts yet</h3>
            <p className="text-slate-500 mb-6">Import your contacts via CSV or add them manually.</p>
            <Link href="/contacts/import"><Button size="lg">Import Contacts</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-4 font-medium text-slate-600">Contact</th>
                    <th className="text-left p-4 font-medium text-slate-600">Status</th>
                    <th className="text-left p-4 font-medium text-slate-600">Tags</th>
                    <th className="text-left p-4 font-medium text-slate-600">Added</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.data as {id: string; email: string; firstName?: string; lastName?: string; status: string; tags?: string[]; createdAt: string}[])?.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                            {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {contact.firstName ? `${contact.firstName} ${contact.lastName || ''}` : contact.email}
                            </p>
                            {contact.firstName && <p className="text-xs text-slate-400">{contact.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {STATUS_ICONS[contact.status]}
                          <span className="text-slate-600 capitalize">{contact.status.toLowerCase()}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-slate-500">{formatDate(contact.createdAt)}</td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(contact.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-slate-500">
                  {data.total} contacts
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>Previous</Button>
                  <Button variant="outline" size="sm" disabled>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
