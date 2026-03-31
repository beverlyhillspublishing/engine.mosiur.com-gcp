'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Zap, Plus, Play, Pause, Trash2, Settings } from 'lucide-react';
import Link from 'next/link';

const TRIGGER_LABELS: Record<string, string> = {
  LIST_SUBSCRIBE: 'When contact subscribes to list',
  CONTACT_CREATED: 'When contact is created',
  CAMPAIGN_OPENED: 'When campaign is opened',
  MANUAL: 'Manual trigger',
  TAG_ADDED: 'When tag is added',
};

export default function AutomationsPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automations', orgId],
    queryFn: () => api.automations.list().then((r) => r.data),
    enabled: !!orgId,
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.automations.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', orgId] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.automations.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', orgId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.automations.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', orgId] }),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Automations</h1>
          <p className="text-slate-500 mt-1">Nurture your audience with automated email sequences</p>
        </div>
        <Link href="/automations/new">
          <Button><Plus className="w-4 h-4 mr-2" />New Automation</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : !(automations as {id: string}[])?.length ? (
        <Card>
          <CardContent className="text-center py-16">
            <Zap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No automations yet</h3>
            <p className="text-slate-500 mb-6">Create automated sequences to engage subscribers at the right time.</p>
            <Link href="/automations/new"><Button size="lg">Create Automation</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(automations as {
            id: string; name: string; trigger: string; status: string; createdAt: string;
            _count?: { steps: number; enrollments: number };
          }[])?.map((automation) => (
            <Card key={automation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      automation.status === 'ACTIVE' ? 'bg-green-100' : 'bg-slate-100'
                    }`}>
                      <Zap className={`w-5 h-5 ${automation.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-500'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 truncate">{automation.name}</h3>
                        <Badge variant={automation.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {automation.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{TRIGGER_LABELS[automation.trigger] || automation.trigger}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {automation._count?.steps || 0} steps · {automation._count?.enrollments || 0} enrolled · Created {formatDate(automation.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/automations/${automation.id}`}>
                      <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
                    </Link>
                    {automation.status === 'ACTIVE' ? (
                      <Button variant="outline" size="sm" onClick={() => pauseMutation.mutate(automation.id)}>
                        <Pause className="w-4 h-4 mr-1" />Pause
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => activateMutation.mutate(automation.id)}>
                        <Play className="w-4 h-4 mr-1" />Activate
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => deleteMutation.mutate(automation.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
