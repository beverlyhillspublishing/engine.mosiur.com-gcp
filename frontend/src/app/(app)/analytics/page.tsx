'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatPercent, formatDate } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Send, Mail, MousePointerClick, UserMinus, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview', orgId],
    queryFn: () => api.analytics.overview().then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: sendsData } = useQuery({
    queryKey: ['analytics', 'sends', orgId, 30],
    queryFn: () => api.analytics.sends(30).then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: opensData } = useQuery({
    queryKey: ['analytics', 'opens', orgId, 30],
    queryFn: () => api.analytics.opens(30).then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: subscriberData } = useQuery({
    queryKey: ['analytics', 'subscribers', orgId, 30],
    queryFn: () => api.analytics.subscribers(30).then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: topCampaigns } = useQuery({
    queryKey: ['analytics', 'top-campaigns', orgId],
    queryFn: () => api.analytics.topCampaigns().then((r) => r.data),
    enabled: !!orgId,
  });

  const statCards = [
    { label: 'Total Sent', value: formatNumber(overview?.totalSent || 0), icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Opens', value: formatNumber(overview?.totalOpens || 0), icon: Mail, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Clicks', value: formatNumber(overview?.totalClicks || 0), icon: MousePointerClick, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Open Rate', value: formatPercent(overview?.avgOpenRate || 0), icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">30-day performance overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base">Emails Sent (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sendsData || []}>
                <defs>
                  <linearGradient id="colorSends2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorSends2)" strokeWidth={2} name="Sends" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Email Opens (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={opensData || []}>
                <defs>
                  <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#colorOpens)" strokeWidth={2} name="Opens" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subscriber Growth (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subscriberData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="subscribed" fill="#22c55e" name="Subscribed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="unsubscribed" fill="#ef4444" name="Unsubscribed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Campaigns by Open Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(topCampaigns as {id: string; name: string; total: number; openRate: string}[])?.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400">{formatNumber(c.total)} sent</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{formatPercent(c.openRate)}</p>
                    <p className="text-xs text-slate-400">open rate</p>
                  </div>
                </div>
              ))}
              {!topCampaigns?.length && <p className="text-sm text-slate-400 text-center py-4">No campaign data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
