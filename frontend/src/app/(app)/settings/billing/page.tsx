'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, CreditCard } from 'lucide-react';

export default function BillingPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);

  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage', orgId],
    queryFn: () => api.billing.usage().then((r) => r.data),
    enabled: !!orgId,
  });

  const { data: plans } = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => api.billing.plans().then((r) => r.data),
    enabled: true,
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId: string) => api.billing.checkout(planId).then((r) => r.data),
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.billing.portal().then((r) => r.data),
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
  });

  const usagePercent = usage?.usagePercent || 0;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-500 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Usage */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Current Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">Emails sent this month</span>
            <span className="font-semibold">{usage?.emailsSentThisMonth || 0} / {usage?.monthlyEmailLimit || 0}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{usagePercent}% of monthly limit used</p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium text-slate-900">Plan: <span className="capitalize">{usage?.planId || 'starter'}</span></p>
              <Badge variant={usage?.subscriptionStatus === 'active' ? 'success' : 'secondary'} className="mt-1">
                {usage?.subscriptionStatus || 'trialing'}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
              {portalMutation.isPending ? 'Loading...' : 'Manage Subscription'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <h2 className="text-xl font-bold text-slate-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(plans as {id: string; name: string; price: number; emailsPerMonth: number; features: string[]}[])?.map((plan) => (
          <Card key={plan.id} className={plan.id === usage?.planId ? 'border-primary shadow-md' : ''}>
            <CardContent className="pt-6">
              {plan.id === usage?.planId && <Badge className="mb-3 bg-primary text-white">Current Plan</Badge>}
              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <div className="text-3xl font-extrabold text-primary mt-2">
                ${plan.price}<span className="text-base font-normal text-slate-500">/mo</span>
              </div>
              <p className="text-sm text-slate-600 mt-1">{plan.emailsPerMonth.toLocaleString()} emails/month</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-4"
                variant={plan.id === usage?.planId ? 'outline' : 'default'}
                disabled={plan.id === usage?.planId || checkoutMutation.isPending}
                onClick={() => plan.id !== usage?.planId && checkoutMutation.mutate(plan.id)}
              >
                {plan.id === usage?.planId ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
