'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatNumber, formatPercent } from '@/lib/utils';
import { Mail, MousePointerClick, UserMinus, AlertCircle } from 'lucide-react';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', id, orgId],
    queryFn: () => api.campaigns.get(id).then((r) => r.data),
    enabled: !!orgId && !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['campaign-stats', id, orgId],
    queryFn: () => api.campaigns.stats(id).then((r) => r.data),
    enabled: !!orgId && !!id,
    refetchInterval: campaign?.status === 'SENDING' ? 5000 : false,
  });

  if (!campaign) return <div className="p-8 text-slate-500">Loading...</div>;

  const statCards = [
    { label: 'Delivered', value: formatNumber(stats?.delivered || 0), sub: `of ${formatNumber(stats?.total || 0)} sent`, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Opened', value: formatPercent(stats?.openRate || 0), sub: `${formatNumber(stats?.opened || 0)} opens`, icon: Mail, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Clicked', value: formatPercent(stats?.clickRate || 0), sub: `${formatNumber(stats?.clicked || 0)} clicks`, icon: MousePointerClick, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Unsubscribed', value: formatPercent(stats?.unsubscribeRate || 0), sub: `${formatNumber(stats?.unsubscribed || 0)} unsubs`, icon: UserMinus, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Bounced', value: formatPercent(stats?.bounceRate || 0), sub: `${formatNumber(stats?.bounced || 0)} bounces`, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900">{campaign.name}</h1>
            <Badge variant={campaign.status === 'SENT' ? 'success' : 'secondary'}>{campaign.status}</Badge>
          </div>
          <p className="text-slate-500">{campaign.subject}</p>
          <p className="text-sm text-slate-400 mt-1">
            From: {campaign.fromName} &lt;{campaign.fromEmail}&gt;
            {campaign.sentAt && ` · Sent ${formatDate(campaign.sentAt)}`}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium mt-1"><Badge>{campaign.status}</Badge></dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="font-medium mt-1">{formatDate(campaign.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Lists</dt>
              <dd className="font-medium mt-1">{campaign.lists?.map((l: {list: {name: string}}) => l.list.name).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Sent at</dt>
              <dd className="font-medium mt-1">{campaign.sentAt ? formatDate(campaign.sentAt) : '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
