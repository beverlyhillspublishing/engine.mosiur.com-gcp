'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent, formatDate } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Mail, Users, MousePointerClick, TrendingUp, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';

  const api = orgApi(orgId);

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview', orgId],
    queryFn: () => api.analytics.overview().then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: sendsData } = useQuery({
    queryKey: ['analytics', 'sends', orgId],
    queryFn: () => api.analytics.sends(30).then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: topCampaigns } = useQuery({
    queryKey: ['analytics', 'top-campaigns', orgId],
    queryFn: () => api.analytics.topCampaigns().then((r) => r.data),
    enabled: !!orgId,
  });

  const statCards = [
    { label: 'Total Contacts', value: formatNumber(overview?.totalContacts || 0), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Emails Sent', value: formatNumber(overview?.totalSent || 0), icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg Open Rate', value: formatPercent(overview?.avgOpenRate || 0), icon: Mail, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Avg Click Rate', value: formatPercent(overview?.avgClickRate || 0), icon: MousePointerClick, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, {useAuth().user?.firstName}!</p>
        </div>
        <Link href="/campaigns/new">
          <Button><Mail className="w-4 h-4 mr-2" />New Campaign</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Send Volume Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Email Activity (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sendsData || []}>
                <defs>
                  <linearGradient id="colorSends" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [formatNumber(Number(v)), 'Emails']} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorSends)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Opens</span>
              <span className="font-semibold">{formatNumber(overview?.totalOpens || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Total Clicks</span>
              <span className="font-semibold">{formatNumber(overview?.totalClicks || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Campaigns</span>
              <span className="font-semibold">{formatNumber(overview?.totalCampaigns || 0)}</span>
            </div>
            <div className="pt-4 border-t">
              <Link href="/analytics"><Button variant="outline" size="sm" className="w-full">View Full Analytics</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Campaigns</CardTitle>
            <Link href="/campaigns"><Button variant="ghost" size="sm">View all</Button></Link>
          </div>
        </CardHeader>
        <CardContent>
          {!topCampaigns?.length ? (
            <div className="text-center py-8 text-slate-500">
              <Mail className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No campaigns yet</p>
              <Link href="/campaigns/new" className="text-primary text-sm mt-1 block hover:underline">Create your first campaign</Link>
            </div>
          ) : (
            <div className="divide-y">
              {topCampaigns?.slice(0, 5).map((c: {
                id: string; name: string; subject: string; sentAt: string; total: number; openRate: string; clickRate: string;
              }) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">Sent</p>
                      <p className="text-sm font-medium">{formatNumber(c.total)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500">Open rate</p>
                      <p className="text-sm font-medium text-green-600">{formatPercent(c.openRate)}</p>
                    </div>
                    <Badge variant="success">{formatDate(c.sentAt)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
