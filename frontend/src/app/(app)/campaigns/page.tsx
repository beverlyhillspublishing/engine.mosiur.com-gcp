'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatNumber, formatPercent } from '@/lib/utils';
import { Mail, Plus, Search, Send, Trash2, Copy, BarChart2 } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'warning',
  SENDING: 'default',
  SENT: 'success',
  PAUSED: 'warning',
  CANCELED: 'destructive',
};

export default function CampaignsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [search] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', orgId],
    queryFn: () => api.campaigns.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.campaigns.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns', orgId] }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.campaigns.send(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns', orgId] }),
  });

  const campaigns = data?.data || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500 mt-1">{data?.total || 0} campaigns total</p>
        </div>
        <Link href="/campaigns/new">
          <Button><Plus className="w-4 h-4 mr-2" />New Campaign</Button>
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search campaigns..." className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Create your first campaign</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Design beautiful emails, target the right audience, and track every result.</p>
            <Link href="/campaigns/new"><Button size="lg">Create Campaign</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: {
            id: string; name: string; subject: string; status: string; sentAt?: string; createdAt: string;
            _count?: { sends: number };
          }) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Badge variant={STATUS_COLORS[campaign.status] || 'secondary'}>
                        {campaign.status}
                      </Badge>
                      <h3 className="font-medium text-slate-900 truncate">{campaign.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{campaign.subject}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {campaign.status === 'SENT' ? `Sent ${formatDate(campaign.sentAt)}` : `Created ${formatDate(campaign.createdAt)}`}
                      {campaign._count?.sends ? ` · ${formatNumber(campaign._count.sends)} recipients` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {campaign.status === 'SENT' && (
                      <Link href={`/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="sm" title="View stats">
                          <BarChart2 className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    {campaign.status === 'DRAFT' && (
                      <>
                        <Link href={`/campaigns/${campaign.id}/edit`}>
                          <Button variant="outline" size="sm">Edit</Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="w-3 h-3 mr-1" />Send
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => api.campaigns.duplicate(campaign.id).then(() => qc.invalidateQueries({ queryKey: ['campaigns', orgId] }))}
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {campaign.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => deleteMutation.mutate(campaign.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
