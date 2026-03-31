'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { orgApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TRIGGERS = [
  { value: 'LIST_SUBSCRIBE', label: 'When contact subscribes to list' },
  { value: 'CONTACT_CREATED', label: 'When contact is created' },
  { value: 'CAMPAIGN_OPENED', label: 'When campaign is opened' },
  { value: 'TAG_ADDED', label: 'When tag is added' },
  { value: 'MANUAL', label: 'Manual trigger' },
];

export default function NewAutomationPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id || '';
  const api = orgApi(orgId);
  const router = useRouter();
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('LIST_SUBSCRIBE');

  const createMutation = useMutation({
    mutationFn: () => api.automations.create({ name, trigger }),
    onSuccess: (res) => router.push(`/automations/${res.data.id}`),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">New Automation</h1>
      <Card>
        <CardHeader><CardTitle>Setup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Automation name</Label>
            <Input placeholder="e.g. Welcome Sequence" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Trigger</Label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Automation'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
