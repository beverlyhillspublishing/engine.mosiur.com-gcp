'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Plus, Trash2, Mail, Clock, Tag } from 'lucide-react';

const STEP_TYPES = [
  { value: 'SEND_EMAIL', label: 'Send Email', icon: Mail },
  { value: 'WAIT_DELAY', label: 'Wait', icon: Clock },
  { value: 'ADD_TAG', label: 'Add Tag', icon: Tag },
  { value: 'REMOVE_TAG', label: 'Remove Tag', icon: Tag },
];

export default function AutomationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const qc = useQueryClient();
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [stepType, setStepType] = useState('SEND_EMAIL');
  const [stepConfig, setStepConfig] = useState<Record<string, string>>({});

  const { data: automation } = useQuery({
    queryKey: ['automation', id, orgId],
    queryFn: () => api.automations.get(id).then((r) => r.data),
    enabled: !!orgId && !!id,
  });

  const activateMutation = useMutation({
    mutationFn: () => api.automations.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', id, orgId] }),
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.automations.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', id, orgId] }),
  });

  const addStepMutation = useMutation({
    mutationFn: () => api.automations.steps.create(id, { stepType, config: stepConfig }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation', id, orgId] }); setAddStepOpen(false); setStepConfig({}); },
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => api.automations.steps.delete(id, stepId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation', id, orgId] }),
  });

  if (!automation) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-slate-900">{automation.name}</h1>
            <Badge variant={automation.status === 'ACTIVE' ? 'success' : 'secondary'}>{automation.status}</Badge>
          </div>
          <p className="text-slate-500 text-sm">{automation.trigger}</p>
        </div>
        <div className="flex gap-2">
          {automation.status === 'ACTIVE' ? (
            <Button variant="outline" onClick={() => pauseMutation.mutate()}><Pause className="w-4 h-4 mr-1" />Pause</Button>
          ) : (
            <Button onClick={() => activateMutation.mutate()}><Play className="w-4 h-4 mr-1" />Activate</Button>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 mb-6">
        {(automation.steps as {id: string; stepOrder: number; stepType: string; config: Record<string, string>}[])?.map((step, idx) => {
          const StepIcon = STEP_TYPES.find((t) => t.value === step.stepType)?.icon || Mail;
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">{idx + 1}</div>
                {idx < automation.steps.length - 1 && <div className="w-0.5 h-8 bg-slate-200 mt-1" />}
              </div>
              <Card className="flex-1">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <StepIcon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{STEP_TYPES.find((t) => t.value === step.stepType)?.label}</p>
                      <p className="text-xs text-slate-500">{JSON.stringify(step.config)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteStepMutation.mutate(step.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <Button variant="outline" onClick={() => setAddStepOpen(true)} className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-2" />Add Step
      </Button>

      <Dialog open={addStepOpen} onOpenChange={setAddStepOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Step</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Step type</Label>
              <Select value={stepType} onValueChange={setStepType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {stepType === 'SEND_EMAIL' && (
              <>
                <div className="space-y-1"><Label>Subject</Label><Input placeholder="Email subject" onChange={(e) => setStepConfig((c) => ({ ...c, subject: e.target.value }))} /></div>
                <div className="space-y-1"><Label>HTML Content</Label><textarea className="w-full h-24 border border-input rounded-md p-2 text-sm" onChange={(e) => setStepConfig((c) => ({ ...c, htmlContent: e.target.value }))} /></div>
              </>
            )}
            {stepType === 'WAIT_DELAY' && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1"><Label>Amount</Label><Input type="number" defaultValue="1" onChange={(e) => setStepConfig((c) => ({ ...c, amount: e.target.value }))} /></div>
                <div className="flex-1 space-y-1">
                  <Label>Unit</Label>
                  <Select defaultValue="days" onValueChange={(v) => setStepConfig((c) => ({ ...c, unit: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            {(stepType === 'ADD_TAG' || stepType === 'REMOVE_TAG') && (
              <div className="space-y-1"><Label>Tag</Label><Input placeholder="tag-name" onChange={(e) => setStepConfig((c) => ({ ...c, tag: e.target.value }))} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStepOpen(false)}>Cancel</Button>
            <Button onClick={() => addStepMutation.mutate()} disabled={addStepMutation.isPending}>Add Step</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
